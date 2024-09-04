import { Logger } from "npmlog";
import { CustomError } from "ts-custom-error";
import { Err } from "ts-results-es";
import { ResolveDependencies } from "../app/dependency-resolving";
import { ParseEnv } from "../app/parse-env";
import { PackumentNotFoundError } from "../common-errors";
import { NodeType, traverseDependencyGraph } from "../domain/dependency-graph";
import { DomainName } from "../domain/domain-name";
import { compareEditorVersion, EditorVersion } from "../domain/editor-version";
import { tryGetTargetEditorVersionFor } from "../domain/package-manifest";
import {
  makePackageReference,
  PackageReference,
  splitPackageReference,
} from "../domain/package-reference";
import { PackageUrl } from "../domain/package-url";
import {
  addTestable,
  hasDependency,
  mapScopedRegistry,
  setDependency,
  UnityProjectManifest,
} from "../domain/project-manifest";
import { unityRegistryUrl } from "../domain/registry-url";
import {
  addScope,
  makeEmptyScopedRegistryFor,
} from "../domain/scoped-registry";
import { SemanticVersion } from "../domain/semantic-version";
import {
  loadProjectManifestUsing,
  saveProjectManifestUsing,
} from "../io/project-manifest-io";
import { DebugLog } from "../logging";
import { areArraysEqual } from "../utils/array-utils";
import {
  logFailedDependency,
  logResolvedDependency,
} from "./dependency-logging";
import { CmdOptions } from "./options";
import { ResultCodes } from "./result-codes";

import { determineEditorVersionUsing } from "../app/determine-editor-version";
import { loadRegistryAuthUsing } from "../app/get-registry-auth";
import { GetRegistryPackumentVersion } from "../app/get-registry-packument-version";
import { ResolvePackumentVersionError } from "../domain/packument";
import { unityRegistry } from "../domain/registry";
import { getUserUpmConfigPathFor } from "../domain/upm-config";
import { getHomePathFromEnv } from "../io/special-paths";
import type { ReadTextFile, WriteTextFile } from "../io/text-file-io";
import { partialApply } from "../utils/fp-utils";
import { isZod } from "../utils/zod-utils";

export class PackageIncompatibleError extends CustomError {
  constructor(
    public readonly packageRef: PackageReference,
    public readonly editorVersion: EditorVersion
  ) {
    super();
  }
}

export class UnresolvedDependenciesError extends CustomError {
  constructor(public readonly packageRef: PackageReference) {
    super();
  }
}

export class CompatibilityCheckFailedError extends CustomError {
  constructor(public readonly packageRef: PackageReference) {
    super();
  }
}

/**
 * Options passed to the add command.
 */
export type AddOptions = CmdOptions<{
  /**
   * Whether to also add the packages to testables.
   */
  test?: boolean;
  /**
   * Whether to run with force. This will add packages even if validation
   * was not possible.
   */
  force?: boolean;
}>;

/**
 * The different command result codes for the add command.
 */
export type AddResultCode = ResultCodes.Ok | ResultCodes.Error;

/**
 * Cmd-handler for adding packages.
 * @param pkgs One or multiple references to packages to add.
 * @param options Options specifying how to add the packages.
 */
type AddCmd = (
  pkgs: PackageReference | PackageReference[],
  options: AddOptions
) => Promise<AddResultCode>;

function pickMostFixable(
  a: Err<ResolvePackumentVersionError>,
  b: Err<ResolvePackumentVersionError>
): Err<ResolvePackumentVersionError> {
  // Anything is more fixable than packument-not-found
  if (
    a.error instanceof PackumentNotFoundError &&
    !(b.error instanceof PackumentNotFoundError)
  )
    return b;
  else if (
    b.error instanceof PackumentNotFoundError &&
    !(a.error instanceof PackumentNotFoundError)
  )
    return a;
  return a;
}

/**
 * Makes a {@link AddCmd} function.
 */
export function makeAddCmd(
  parseEnv: ParseEnv,
  getRegistryPackumentVersion: GetRegistryPackumentVersion,
  resolveDependencies: ResolveDependencies,
  readTextFile: ReadTextFile,
  writeTextFile: WriteTextFile,
  log: Logger,
  debugLog: DebugLog
): AddCmd {
  const loadProjectManifest = partialApply(
    loadProjectManifestUsing,
    readTextFile,
    debugLog
  );

  const saveProjectManifest = partialApply(
    saveProjectManifestUsing,
    writeTextFile
  );

  return async (pkgs, options) => {
    if (!Array.isArray(pkgs)) pkgs = [pkgs];

    // parse env
    const env = await parseEnv(options);

    const editorVersion = await determineEditorVersionUsing(
      readTextFile,
      debugLog,
      env.cwd
    );

    if (typeof editorVersion === "string")
      log.warn(
        "editor.version",
        `${editorVersion} is unknown, the editor version check is disabled`
      );
    const homePath = getHomePathFromEnv(process.env);
    const upmConfigPath = getUserUpmConfigPathFor(
      process.env,
      homePath,
      env.systemUser
    );

    const primaryRegistry = await loadRegistryAuthUsing(
      readTextFile,
      debugLog,
      upmConfigPath,
      env.primaryRegistryUrl
    );

    const tryAddToManifest = async function (
      manifest: UnityProjectManifest,
      pkg: PackageReference
    ): Promise<[UnityProjectManifest, boolean]> {
      // is upstream package flag
      let isUpstreamPackage = false;
      // parse name
      const [name, requestedVersion] = splitPackageReference(pkg);

      // packages that added to scope registry
      const pkgsInScope = Array.of<DomainName>();
      let versionToAdd = requestedVersion;
      if (
        requestedVersion === undefined ||
        !isZod(requestedVersion, PackageUrl)
      ) {
        let resolveResult = await getRegistryPackumentVersion(
          name,
          requestedVersion,
          primaryRegistry
        ).promise;
        if (resolveResult.isErr() && env.upstream) {
          const upstreamResult = await getRegistryPackumentVersion(
            name,
            requestedVersion,
            unityRegistry
          ).promise;
          if (upstreamResult.isOk()) {
            resolveResult = upstreamResult;
            isUpstreamPackage = true;
          } else {
            resolveResult = pickMostFixable(resolveResult, upstreamResult);
          }
        }

        if (resolveResult.isErr()) throw resolveResult.error;

        const packumentVersion = resolveResult.value.packumentVersion;
        versionToAdd = packumentVersion.version;

        // Only do compatibility check when we have a valid editor version
        if (typeof editorVersion !== "string") {
          let targetEditorVersion: EditorVersion | null;
          try {
            targetEditorVersion =
              tryGetTargetEditorVersionFor(packumentVersion);
          } catch (error) {
            if (!options.force) {
              const packageRef = makePackageReference(name, versionToAdd);
              debugLog(
                `"${packageRef}" is malformed. Target editor version could not be determined.`
              );
              throw new CompatibilityCheckFailedError(packageRef);
            }
            targetEditorVersion = null;
          }

          // verify editor version
          const isCompatible =
            targetEditorVersion === null ||
            compareEditorVersion(editorVersion, targetEditorVersion) >= 0;
          if (!isCompatible && !options.force)
            throw new PackageIncompatibleError(
              makePackageReference(name, versionToAdd),
              targetEditorVersion!
            );
        }

        // pkgsInScope
        if (!isUpstreamPackage) {
          debugLog(`fetch: ${makePackageReference(name, requestedVersion)}`);
          const dependencyGraph = await resolveDependencies(
            [primaryRegistry, unityRegistry],
            name,
            versionToAdd,
            true
          );

          let isAnyDependencyUnresolved = false;
          for (const [
            dependencyName,
            dependencyVersion,
            dependency,
          ] of traverseDependencyGraph(dependencyGraph)) {
            if (dependency.type === NodeType.Failed) {
              logFailedDependency(
                log,
                dependencyName,
                dependencyVersion,
                dependency
              );
              // If the manifest already has the dependency than it does not
              // really matter that it was not resolved.
              if (!hasDependency(manifest, dependencyName))
                isAnyDependencyUnresolved = true;
              continue;
            }
            if (dependency.type === NodeType.Unresolved) continue;

            const dependencyRef = makePackageReference(
              dependencyName,
              dependencyVersion
            );
            logResolvedDependency(debugLog, dependencyRef, dependency.source);

            const isUnityPackage =
              dependency.source === "built-in" ||
              dependency.source === unityRegistryUrl;
            if (isUnityPackage) continue;

            // add depsValid to pkgsInScope.
            pkgsInScope.push(dependencyName);
          }

          // print suggestion for depsInvalid

          if (isAnyDependencyUnresolved && !options.force)
            throw new UnresolvedDependenciesError(
              makePackageReference(name, versionToAdd)
            );
        } else pkgsInScope.push(name);
      }
      // add to dependencies
      const oldVersion = manifest.dependencies[name];
      // Whether a change was made that requires overwriting the manifest
      let dirty = false;
      manifest = setDependency(
        manifest,
        name,
        versionToAdd as PackageUrl | SemanticVersion
      );
      if (!oldVersion) {
        // Log the added package
        log.notice(
          "manifest",
          `added ${makePackageReference(name, versionToAdd)}`
        );
        dirty = true;
      } else if (oldVersion !== versionToAdd) {
        // Log the modified package version
        log.notice(
          "manifest",
          `modified ${name} ${oldVersion} => ${versionToAdd}`
        );
        dirty = true;
      } else {
        // Log the existed package
        log.notice(
          "manifest",
          `existed ${makePackageReference(name, versionToAdd)}`
        );
      }

      if (!isUpstreamPackage && pkgsInScope.length > 0) {
        manifest = mapScopedRegistry(
          manifest,
          primaryRegistry.url,
          (initial) => {
            let updated =
              initial ?? makeEmptyScopedRegistryFor(primaryRegistry.url);

            updated = pkgsInScope.reduce(addScope, updated!);
            dirty =
              !areArraysEqual(updated!.scopes, initial?.scopes ?? []) || dirty;

            return updated;
          }
        );
      }
      if (options.test) manifest = addTestable(manifest, name);

      return [manifest, dirty];
    };

    // load manifest
    let manifest = await loadProjectManifest(env.cwd);

    // add
    let dirty = false;
    for (const pkg of pkgs) {
      const [newManifest, manifestChanged] = await tryAddToManifest(
        manifest,
        pkg
      );
      if (manifestChanged) {
        manifest = newManifest;
        dirty = true;
      }
    }

    // Save manifest
    if (dirty) {
      await saveProjectManifest(env.cwd, manifest);
      // print manifest notice
      log.notice("", "please open Unity project to apply changes");
    }

    return ResultCodes.Ok;
  };
}
