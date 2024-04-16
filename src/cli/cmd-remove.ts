import log from "./logger";
import {
  ManifestLoadError,
  ManifestSaveError,
  tryLoadProjectManifest,
  trySaveProjectManifest,
} from "../io/project-manifest-io";
import { EnvParseError, parseEnv } from "../utils/env";
import {
  hasVersion,
  makePackageReference,
  PackageReference,
} from "../domain/package-reference";
import { removeScope } from "../domain/scoped-registry";
import {
  mapScopedRegistry,
  removeDependency,
  UnityProjectManifest,
} from "../domain/project-manifest";
import { CmdOptions } from "./options";
import { Err, Ok, Result } from "ts-results-es";

import {
  PackageWithVersionError,
  PackumentNotFoundError,
} from "../common-errors";
import { logManifestLoadError, logManifestSaveError } from "./error-logging";

export type RemoveError =
  | EnvParseError
  | PackageWithVersionError
  | PackumentNotFoundError
  | ManifestLoadError
  | ManifestSaveError;

export type RemoveOptions = CmdOptions;

export const remove = async function (
  pkgs: PackageReference[] | PackageReference,
  options: RemoveOptions
): Promise<Result<void, RemoveError>> {
  if (!Array.isArray(pkgs)) pkgs = [pkgs];
  // parse env
  const envResult = await parseEnv(options);
  if (envResult.isErr()) return envResult;
  const env = envResult.value;

  const tryRemoveFromManifest = async function (
    manifest: UnityProjectManifest,
    pkg: PackageReference
  ): Promise<Result<UnityProjectManifest, RemoveError>> {
    // parse name
    if (hasVersion(pkg)) {
      log.warn("", `please do not specify a version (Write only '${pkg}').`);
      return Err(new PackageWithVersionError());
    }

    // not found array
    const versionInManifest = manifest.dependencies[pkg];
    if (versionInManifest === undefined) {
      log.error("404", `package not found: ${pkg}`);
      return Err(new PackumentNotFoundError());
    }

    manifest = removeDependency(manifest, pkg);

    manifest = mapScopedRegistry(manifest, env.registry.url, (initial) => {
      if (initial === null) return null;
      return removeScope(initial, pkg);
    });

    log.notice(
      "manifest",
      `removed ${makePackageReference(pkg, versionInManifest)}`
    );
    return Ok(manifest);
  };

  // load manifest
  const manifestResult = await tryLoadProjectManifest(env.cwd).promise;
  if (manifestResult.isErr()) {
    logManifestLoadError(manifestResult.error);
    return manifestResult;
  }
  let manifest = manifestResult.value;

  // remove
  for (const pkg of pkgs) {
    const result = await tryRemoveFromManifest(manifest, pkg);
    if (result.isErr()) return result;
    manifest = result.value;
  }

  // save manifest
  const saveResult = await trySaveProjectManifest(env.cwd, manifest).promise;
  if (saveResult.isErr()) {
    logManifestSaveError(saveResult.error);
    return saveResult;
  }

  // print manifest notice
  log.notice("", "please open Unity project to apply changes");

  return Ok(undefined);
};
