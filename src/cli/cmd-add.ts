import { isPackageUrl, PackageUrl } from "../domain/package-url";
import {
  LoadProjectManifest,
  WriteProjectManifest,
} from "../io/project-manifest-io";
import { ParseEnv } from "../services/parse-env";
import { compareEditorVersion, EditorVersion } from "../domain/editor-version";
import { DomainName } from "../domain/domain-name";
import {
  makePackageReference,
  PackageReference,
  splitPackageReference,
} from "../domain/package-reference";
import {
  addScope,
  makeEmptyScopedRegistryFor,
} from "../domain/scoped-registry";
import {
  addTestable,
  hasDependency,
  mapScopedRegistry,
  setDependency,
  UnityProjectManifest,
} from "../domain/project-manifest";
import { CmdOptions } from "./options";
import { pickMostFixable } from "../packument-version-resolving";
import { SemanticVersion } from "../domain/semantic-version";
import { areArraysEqual } from "../utils/array-utils";
import { CustomError } from "ts-custom-error";
import { ResolveDependencies } from "../services/dependency-resolving";
import { ResolveRemotePackumentVersion } from "../services/resolve-remote-packument-version";
import { Logger } from "npmlog";
import { logResolvedDependency } from "./dependency-logging";
import { unityRegistryUrl } from "../domain/registry-url";
import { tryGetTargetEditorVersionFor } from "../domain/package-manifest";
import { DebugLog } from "../logging";
import { DetermineEditorVersion } from "../services/determine-editor-version";
import { ResultCodes } from "./result-codes";
import { logError } from "./error-logging";
import { NodeType, traverseDependencyGraph } from "../domain/dependency-graph";

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

export type AddOptions = CmdOptions<{
  test?: boolean;
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

/**
 * Makes a {@link AddCmd} function.
 */
export function makeAddCmd(
  parseEnv: ParseEnv,
  resolveRemotePackumentVersion: ResolveRemotePackumentVersion,
  resolveDependencies: ResolveDependencies,
  loadProjectManifest: LoadProjectManifest,
  writeProjectManifest: WriteProjectManifest,
  determineEditorVersion: DetermineEditorVersion,
  log: Logger,
  debugLog: DebugLog
): AddCmd {
  return async (pkgs, options) => {
    if (!Array.isArray(pkgs)) pkgs = [pkgs];

    // parse env
    const env = await parseEnv(options);

    const editorVersion = await determineEditorVersion(env.cwd);

    if (typeof editorVersion === "string")
      log.warn(
        "editor.version",
        `${editorVersion} is unknown, the editor version check is disabled`
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
      if (requestedVersion === undefined || !isPackageUrl(requestedVersion)) {
        let resolveResult = await resolveRemotePackumentVersion(
          name,
          requestedVersion,
          env.registry
        ).promise;
        if (resolveResult.isErr() && env.upstream) {
          const upstreamResult = await resolveRemotePackumentVersion(
            name,
            requestedVersion,
            env.upstreamRegistry
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
            [env.registry, env.upstreamRegistry],
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
              logError(log, dependency.error);
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
        manifest = mapScopedRegistry(manifest, env.registry.url, (initial) => {
          let updated = initial ?? makeEmptyScopedRegistryFor(env.registry.url);

          updated = pkgsInScope.reduce(addScope, updated!);
          dirty =
            !areArraysEqual(updated!.scopes, initial?.scopes ?? []) || dirty;

          return updated;
        });
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
      await writeProjectManifest(env.cwd, manifest);
      // print manifest notice
      log.notice("", "please open Unity project to apply changes");
    }

    return ResultCodes.Ok;
  };
}
