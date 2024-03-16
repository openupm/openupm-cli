import log from "./logger";
import {
  ManifestLoadError,
  ManifestParseError,
  ManifestSaveError,
  tryLoadProjectManifest,
  trySaveProjectManifest,
} from "./utils/project-manifest-io";
import { EnvParseError, parseEnv } from "./utils/env";
import {
  hasVersion,
  packageReference,
  PackageReference,
} from "./types/package-reference";
import { removeScope } from "./types/scoped-registry";
import {
  removeDependency,
  tryGetScopedRegistryByUrl,
} from "./types/project-manifest";
import { CmdOptions } from "./types/options";
import { Err, Ok, Result } from "ts-results-es";

import {
  PackageWithVersionError,
  PackumentNotFoundError,
  RequiredFileNotFoundError,
} from "./common-errors";

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
): Promise<Result<void, RemoveError[]>> {
  if (!Array.isArray(pkgs)) pkgs = [pkgs];
  // parse env
  const envResult = await parseEnv(options, true);
  if (envResult.isErr()) return Err([envResult.error]);
  const env = envResult.value;

  const removeSingle = async function (
    pkg: PackageReference
  ): Promise<Result<void, RemoveError>> {
    // parse name
    if (hasVersion(pkg)) {
      log.warn("", `please do not specify a version (Write only '${pkg}').`);
      return Err(new PackageWithVersionError());
    }
    // load manifest
    const manifestResult = await tryLoadProjectManifest(env.cwd);
    if (manifestResult.isErr()) {
      if (manifestResult.error instanceof RequiredFileNotFoundError)
        log.error(
          "manifest",
          `manifest at ${manifestResult.error.path} does not exist`
        );
      else if (manifestResult.error instanceof ManifestParseError) {
        log.error(
          "manifest",
          `failed to parse manifest at ${manifestResult.error.path}`
        );
        log.error("manifest", manifestResult.error.message);
      }
      return manifestResult;
    }
    let manifest = manifestResult.value;

    // not found array
    const versionInManifest = manifest.dependencies[pkg];
    if (versionInManifest === undefined) {
      log.error("404", `package not found: ${pkg}`);
      return Err(new PackumentNotFoundError());
    }

    manifest = removeDependency(manifest, pkg);

    const entry = tryGetScopedRegistryByUrl(manifest, env.registry.url);
    if (entry !== null) removeScope(entry, pkg);

    // save manifest
    const saveResult = await trySaveProjectManifest(env.cwd, manifest);
    if (saveResult.isErr()) return saveResult;

    log.notice(
      "manifest",
      `removed ${packageReference(pkg, versionInManifest)}`
    );
    return Ok(undefined);
  };
  // remove
  const results = Array.of<Result<void, RemoveError>>();
  for (const pkg of pkgs) results.push(await removeSingle(pkg));

  const errors = results.reduce((errors, result) => {
    if (result.isErr()) return [...errors, result.error];
    return errors;
  }, Array.of<RemoveError>());

  // print manifest notice
  log.notice("", "please open Unity project to apply changes");

  return errors.length > 0 ? Err(errors) : Ok(undefined);
};
