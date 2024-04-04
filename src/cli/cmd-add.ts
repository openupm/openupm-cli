import log from "./logger";
import url from "url";
import { isPackageUrl, PackageUrl } from "../domain/package-url";
import {
  ManifestLoadError,
  ManifestSaveError,
  tryLoadProjectManifest,
  trySaveProjectManifest,
} from "../io/project-manifest-io";
import { EnvParseError, parseEnv } from "../utils/env";
import {
  compareEditorVersion,
  tryParseEditorVersion,
} from "../domain/editor-version";
import { makeNpmClient } from "../npm-client";
import { DomainName } from "../domain/domain-name";
import {
  makePackageReference,
  PackageReference,
  splitPackageReference,
} from "../domain/package-reference";
import { addScope, makeScopedRegistry } from "../domain/scoped-registry";
import {
  addDependency,
  addTestable,
  mapScopedRegistry,
} from "../domain/project-manifest";
import { CmdOptions } from "./options";
import {
  PackumentResolveError,
  tryResolve,
  VersionNotFoundError,
} from "../packument-resolving";
import { SemanticVersion } from "../domain/semantic-version";
import { fetchPackageDependencies } from "../dependency-resolving";
import { areArraysEqual } from "../utils/array-utils";
import { RegistryUrl } from "../domain/registry-url";
import { PackumentNotFoundError } from "../common-errors";
import { Err, Ok, Result } from "ts-results-es";
import { HttpErrorBase } from "npm-registry-fetch";
import { CustomError } from "ts-custom-error";
import { logManifestLoadError, logManifestSaveError } from "../error-logging";
import { targetEditorVersionFor } from "../domain/packument";

export class InvalidPackumentDataError extends CustomError {
  constructor(readonly issue: string) {
    super("A packument object was malformed.");
  }
}

export class EditorIncompatibleError extends CustomError {
  constructor() {
    super(
      "A packuments target editor-version was not compatible with the installed editor-version."
    );
  }
}

export class UnresolvedDependencyError extends CustomError {
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
  | ManifestSaveError;

/**
 * @throws {Error} An unhandled error occurred.
 */
export const add = async function (
  pkgs: PackageReference | PackageReference[],
  options: AddOptions
): Promise<Result<void, AddError[]>> {
  if (!Array.isArray(pkgs)) pkgs = [pkgs];
  // parse env
  const envResult = await parseEnv(options);
  if (envResult.isErr()) return Err([envResult.error]);
  const env = envResult.value;

  const client = makeNpmClient();

  const makeEmptyScopedRegistryFor = (registryUrl: RegistryUrl) => {
    const name = url.parse(registryUrl).hostname;
    if (name === null) throw new Error("Could not resolve registry name");
    return makeScopedRegistry(name, registryUrl);
  };

  const addSingle = async function (
    pkg: PackageReference
  ): Promise<Result<boolean, AddError>> {
    // is upstream package flag
    let isUpstreamPackage = false;
    // parse name
    const [name, requestedVersion] = splitPackageReference(pkg);

    // load manifest
    const loadResult = await tryLoadProjectManifest(env.cwd).promise;
    if (loadResult.isErr()) {
      logManifestLoadError(loadResult.error);

      return loadResult;
    }
    let manifest = loadResult.value;

    // packages that added to scope registry
    const pkgsInScope = Array.of<DomainName>();
    let versionToAdd = requestedVersion;
    if (requestedVersion === undefined || !isPackageUrl(requestedVersion)) {
      let resolveResult = await tryResolve(
        client,
        name,
        requestedVersion,
        env.registry
      ).promise;
      if (resolveResult.isErr() && env.upstream) {
        resolveResult = await tryResolve(
          client,
          name,
          requestedVersion,
          env.upstreamRegistry
        ).promise;
        if (resolveResult.isOk()) isUpstreamPackage = true;
      }

      if (resolveResult.isErr()) {
        if (resolveResult.error instanceof PackumentNotFoundError)
          log.error("404", `package not found: ${name}`);
        else if (resolveResult.error instanceof VersionNotFoundError) {
          const versionList = [...resolveResult.error.availableVersions]
            .reverse()
            .join(", ");
          log.warn(
            "404",
            `version ${resolveResult.error.requestedVersion} is not a valid choice of: ${versionList}`
          );
        }
        return resolveResult;
      }

      const packumentVersion = resolveResult.value.packumentVersion;
      versionToAdd = packumentVersion.version;

      const targetEditorVersion = targetEditorVersionFor(packumentVersion);
      // verify editor version
      if (targetEditorVersion !== null) {
        if (env.editorVersion) {
          const editorVersionResult = tryParseEditorVersion(env.editorVersion);
          const requiredEditorVersionResult =
            tryParseEditorVersion(targetEditorVersion);
          if (!editorVersionResult) {
            log.warn(
              "editor.version",
              `${env.editorVersion} is unknown, the editor version check is disabled`
            );
          }
          if (!requiredEditorVersionResult) {
            log.warn("package.unity", `${targetEditorVersion} is not valid`);
            if (!options.force) {
              log.notice(
                "suggest",
                "contact the package author to fix the issue, or run with option -f to ignore the warning"
              );
              return Err(
                new InvalidPackumentDataError("Editor-version not valid.")
              );
            }
          }
          if (
            editorVersionResult &&
            requiredEditorVersionResult &&
            compareEditorVersion(
              editorVersionResult,
              requiredEditorVersionResult
            ) < 0
          ) {
            log.warn(
              "editor.version",
              `requires ${targetEditorVersion} but found ${env.editorVersion}`
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
      }
      // pkgsInScope
      if (!isUpstreamPackage) {
        log.verbose(
          "dependency",
          `fetch: ${makePackageReference(name, requestedVersion)}`
        );
        const [depsValid, depsInvalid] = await fetchPackageDependencies(
          env.registry,
          env.upstreamRegistry,
          name,
          requestedVersion,
          true,
          client
        );
        // add depsValid to pkgsInScope.
        depsValid
          .filter((x) => !x.upstream && !x.internal)
          .map((x) => x.name)
          .forEach((name) => pkgsInScope.push(name));
        // print suggestion for depsInvalid
        let isAnyDependencyUnresolved = false;
        depsInvalid.forEach((depObj) => {
          if (
            depObj.reason instanceof PackumentNotFoundError ||
            depObj.reason instanceof VersionNotFoundError
          ) {
            // Not sure why it thinks the manifest can be null here.
            const resolvedVersion = manifest.dependencies[depObj.name];
            const wasResolved = Boolean(resolvedVersion);
            if (!wasResolved) {
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
    // I am not sure why we need this assertion. I'm pretty sure
    // code-logic ensures the correct type.
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
    // save manifest
    if (dirty) {
      const saveResult = await trySaveProjectManifest(env.cwd, manifest)
        .promise;
      if (saveResult.isErr()) {
        logManifestSaveError(saveResult.error);
        return saveResult;
      }
    }
    return Ok(dirty);
  };

  // add
  const results = Array.of<Result<boolean, AddError>>();
  for (const pkg of pkgs) results.push(await addSingle(pkg));

  const [errors, dirty] = results.reduce(
    ([errors, dirty], result) => {
      if (result.isErr()) return [[...errors, result.error], dirty];
      return [errors, result.value || dirty];
    },
    [Array.of<AddError>(), false]
  );

  // print manifest notice
  if (dirty) log.notice("", "please open Unity project to apply changes");

  return errors.length === 0 ? Ok(undefined) : Err(errors);
};
