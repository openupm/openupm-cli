import { isPackageUrl, PackageUrl } from "../domain/package-url";
import {
  LoadProjectManifest,
  WriteProjectManifest,
} from "../io/project-manifest-io";
import { ParseEnv } from "../services/parse-env";
import {
  compareEditorVersion,
  stringifyEditorVersion,
} from "../domain/editor-version";
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
import {
  PackumentVersionResolveError,
  pickMostFixable,
} from "../packument-version-resolving";
import { SemanticVersion } from "../domain/semantic-version";
import { areArraysEqual } from "../utils/array-utils";
import { Err, Ok, Result } from "ts-results-es";
import { CustomError } from "ts-custom-error";
import {
  DependencyResolveError,
  ResolveDependencies,
} from "../services/dependency-resolving";
import { ResolveRemotePackumentVersion } from "../services/resolve-remote-packument-version";
import { Logger } from "npmlog";
import { logValidDependency } from "./dependency-logging";
import { unityRegistryUrl } from "../domain/registry-url";
import { tryGetTargetEditorVersionFor } from "../domain/package-manifest";
import { VersionNotFoundError } from "../domain/packument";
import { DebugLog } from "../logging";
import { DetermineEditorVersion } from "../services/determine-editor-version";
import { ResultCodes } from "./result-codes";
import { notifyRemotePackumentVersionResolvingFailed } from "./error-logging";

export class InvalidPackumentDataError extends CustomError {
  private readonly _class = "InvalidPackumentDataError";
  constructor(readonly issue: string) {
    super("A packument object was malformed.");
  }
}

export class EditorIncompatibleError extends CustomError {
  private readonly _class = "EditorIncompatibleError";
  constructor() {
    super(
      "A packuments target editor-version was not compatible with the installed editor-version."
    );
  }
}

export class UnresolvedDependencyError extends CustomError {
  private readonly _class = "UnresolvedDependencyError";
  constructor() {
    super("A packuments dependency could not be resolved.");
  }
}

export type AddOptions = CmdOptions<{
  test?: boolean;
  force?: boolean;
}>;

type AddError =
  | PackumentVersionResolveError
  | InvalidPackumentDataError
  | EditorIncompatibleError
  | UnresolvedDependencyError
  | DependencyResolveError;

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
    ): Promise<Result<[UnityProjectManifest, boolean], AddError>> {
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

        if (resolveResult.isErr()) {
          notifyRemotePackumentVersionResolvingFailed(
            log,
            name,
            resolveResult.error
          );
          return resolveResult;
        }

        const packumentVersion = resolveResult.value.packumentVersion;
        versionToAdd = packumentVersion.version;

        const targetEditorVersionResult =
          tryGetTargetEditorVersionFor(packumentVersion);
        if (targetEditorVersionResult.isErr()) {
          log.warn(
            "package.unity",
            `${targetEditorVersionResult.error.versionString} is not valid`
          );
          if (!options.force) {
            log.notice(
              "suggest",
              "contact the package author to fix the issue, or run with option -f to ignore the warning"
            );
            return Err(
              new InvalidPackumentDataError("Editor-version not valid.")
            );
          }
        } else {
          const targetEditorVersion = targetEditorVersionResult.value;

          // verify editor version
          if (
            targetEditorVersion !== null &&
            typeof editorVersion !== "string" &&
            compareEditorVersion(editorVersion, targetEditorVersion) < 0
          ) {
            log.warn(
              "editor.version",
              `requires ${targetEditorVersion} but found ${stringifyEditorVersion(
                editorVersion
              )}`
            );
            if (!options.force) {
              log.notice(
                "suggest",
                `upgrade the editor to ${targetEditorVersion}, or run with option -f to ignore the warning`
              );
              return Err(new EditorIncompatibleError());
            }
          }
        }

        // pkgsInScope
        if (!isUpstreamPackage) {
          debugLog(`fetch: ${makePackageReference(name, requestedVersion)}`);
          const resolveResult = await resolveDependencies(
            [env.registry, env.upstreamRegistry],
            name,
            requestedVersion,
            true
          );
          if (resolveResult.isErr()) {
            notifyRemotePackumentVersionResolvingFailed(
              log,
              name,
              resolveResult.error
            );
            return resolveResult;
          }
          const [depsValid, depsInvalid] = resolveResult.value;

          // add depsValid to pkgsInScope.
          depsValid.forEach((dependency) =>
            logValidDependency(debugLog, dependency)
          );
          depsValid
            .filter((x) => {
              const isUnityPackage =
                x.source === "built-in" || x.source === unityRegistryUrl;
              return !isUnityPackage;
            })
            .map((x) => x.name)
            .forEach((name) => pkgsInScope.push(name));
          // print suggestion for depsInvalid
          let isAnyDependencyUnresolved = false;
          depsInvalid.forEach((depObj) => {
            notifyRemotePackumentVersionResolvingFailed(
              log,
              depObj.name,
              depObj.reason
            );

            // If the manifest already has the dependency than it does not
            // really matter that it was not resolved.
            if (!hasDependency(manifest, depObj.name)) {
              isAnyDependencyUnresolved = true;
              if (depObj.reason instanceof VersionNotFoundError)
                log.notice(
                  "suggest",
                  `to install ${makePackageReference(
                    depObj.name,
                    depObj.reason.requestedVersion
                  )} or a replaceable version manually`
                );
            }
          });
          if (isAnyDependencyUnresolved) {
            if (!options.force) {
              log.error(
                "missing dependencies",
                "please resolve the issue or run with option -f to ignore the warning"
              );
              return Err(new UnresolvedDependencyError());
            }
          }
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

      return Ok([manifest, dirty]);
    };

    // load manifest
    let manifest = await loadProjectManifest(env.cwd);

    // add
    let dirty = false;
    for (const pkg of pkgs) {
      const result = await tryAddToManifest(manifest, pkg);
      if (result.isErr()) return ResultCodes.Error;

      const [newManifest, manifestChanged] = result.value;
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
