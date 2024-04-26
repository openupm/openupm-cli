import { isPackageUrl, PackageUrl } from "../domain/package-url";
import {
  LoadProjectManifest,
  ManifestLoadError,
  ManifestWriteError,
  WriteProjectManifest,
} from "../io/project-manifest-io";
import { EnvParseError, ParseEnvService } from "../services/parse-env";
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
  addDependency,
  addTestable,
  hasDependency,
  mapScopedRegistry,
  UnityProjectManifest,
} from "../domain/project-manifest";
import { CmdOptions } from "./options";
import {
  PackumentResolveError,
  pickMostFixable,
  VersionNotFoundError,
} from "../packument-resolving";
import { SemanticVersion } from "../domain/semantic-version";
import { areArraysEqual } from "../utils/array-utils";
import { Err, Ok, Result } from "ts-results-es";
import { HttpErrorBase } from "npm-registry-fetch";
import { CustomError } from "ts-custom-error";
import {
  logManifestLoadError,
  logManifestSaveError,
  logPackumentResolveError,
} from "./error-logging";
import { tryGetTargetEditorVersionFor } from "../domain/packument";
import { ResolveDependenciesService } from "../services/dependency-resolving";
import { ResolveRemotePackumentService } from "../services/resolve-remote-packument";
import { Logger } from "npmlog";
import { logValidDependency } from "./dependency-logging";
import { unityRegistryUrl } from "../domain/registry-url";

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

export type AddError =
  | EnvParseError
  | ManifestLoadError
  | PackumentResolveError
  | HttpErrorBase
  | InvalidPackumentDataError
  | EditorIncompatibleError
  | UnresolvedDependencyError
  | ManifestWriteError;

/**
 * Cmd-handler for adding packages.
 * @param pkgs One or multiple references to packages to add.
 * @param options Options specifying how to add the packages.
 */
type AddCmd = (
  pkgs: PackageReference | PackageReference[],
  options: AddOptions
) => Promise<Result<void, AddError>>;

/**
 * Makes a {@link AddCmd} function.
 */
export function makeAddCmd(
  parseEnv: ParseEnvService,
  resolveRemovePackument: ResolveRemotePackumentService,
  resolveDependencies: ResolveDependenciesService,
  loadProjectManifest: LoadProjectManifest,
  writeProjectManifest: WriteProjectManifest,
  log: Logger
): AddCmd {
  return async (pkgs, options) => {
    if (!Array.isArray(pkgs)) pkgs = [pkgs];
    // parse env
    const envResult = await parseEnv(options);
    if (envResult.isErr()) return envResult;
    const env = envResult.value;

    if (typeof env.editorVersion === "string")
      log.warn(
        "editor.version",
        `${env.editorVersion} is unknown, the editor version check is disabled`
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
        let resolveResult = await resolveRemovePackument(
          name,
          requestedVersion,
          env.registry
        ).promise;
        if (resolveResult.isErr() && env.upstream) {
          const upstreamResult = await resolveRemovePackument(
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
          logPackumentResolveError(log, name, resolveResult.error);
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
            typeof env.editorVersion !== "string" &&
            compareEditorVersion(env.editorVersion, targetEditorVersion) < 0
          ) {
            log.warn(
              "editor.version",
              `requires ${targetEditorVersion} but found ${stringifyEditorVersion(
                env.editorVersion
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
          log.verbose(
            "dependency",
            `fetch: ${makePackageReference(name, requestedVersion)}`
          );
          const [depsValid, depsInvalid] = await resolveDependencies(
            env.registry,
            env.upstreamRegistry,
            name,
            requestedVersion,
            true
          );
          // add depsValid to pkgsInScope.
          depsValid.forEach((dependency) =>
            logValidDependency(log, dependency)
          );
          depsValid
            .filter((x) => {
              if (x.internal) return false;
              const isUnityPackage = x.source === unityRegistryUrl;
              return !isUnityPackage;
            })
            .map((x) => x.name)
            .forEach((name) => pkgsInScope.push(name));
          // print suggestion for depsInvalid
          let isAnyDependencyUnresolved = false;
          depsInvalid.forEach((depObj) => {
            logPackumentResolveError(log, depObj.name, depObj.reason);

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
      manifest = addDependency(
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
    const loadResult = await loadProjectManifest(env.cwd).promise;
    if (loadResult.isErr()) {
      logManifestLoadError(log, loadResult.error);
      return loadResult;
    }
    let manifest = loadResult.value;

    // add
    let dirty = false;
    for (const pkg of pkgs) {
      const result = await tryAddToManifest(manifest, pkg);
      if (result.isErr()) return result;

      const [newManifest, manifestChanged] = result.value;
      if (manifestChanged) {
        manifest = newManifest;
        dirty = true;
      }
    }

    // Save manifest
    if (dirty) {
      const saveResult = await writeProjectManifest(env.cwd, manifest).promise;
      if (saveResult.isErr()) {
        logManifestSaveError(log, saveResult.error);
        return saveResult;
      }

      // print manifest notice
      log.notice("", "please open Unity project to apply changes");
    }

    return Ok(undefined);
  };
}
