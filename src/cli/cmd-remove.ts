import {
  LoadProjectManifest,
  ManifestLoadError,
  ManifestWriteError,
  WriteProjectManifest,
} from "../io/project-manifest-io";
import { EnvParseError, ParseEnvService } from "../services/parse-env";
import {
  hasVersion,
  makePackageReference,
  PackageReference,
  splitPackageReference,
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
import {
  logEnvParseError,
  logManifestLoadError,
  logManifestSaveError,
} from "./error-logging";
import { Logger } from "npmlog";
import { ResultCodes } from "./result-codes";

/**
 * The possible result codes with which the remove command can exit.
 */
export type RemoveResultCode = ResultCodes.Ok | ResultCodes.Error;

type RemoveError =
  | EnvParseError
  | PackageWithVersionError
  | PackumentNotFoundError
  | ManifestLoadError
  | ManifestWriteError;

export type RemoveOptions = CmdOptions;

/**
 * Cmd-handler for removing packages.
 * @param pkgs One or multiple package-references to remove.
 * @param options Command options.
 */
export type RemoveCmd = (
  pkgs: PackageReference[] | PackageReference,
  options: RemoveOptions
) => Promise<RemoveResultCode>;

/**
 * Makes a {@link RemoveCmd} function.
 */
export function makeRemoveCmd(
  parseEnv: ParseEnvService,
  loadProjectManifest: LoadProjectManifest,
  writeProjectManifest: WriteProjectManifest,
  log: Logger
): RemoveCmd {
  return async (pkgs, options) => {
    if (!Array.isArray(pkgs)) pkgs = [pkgs];
    // parse env
    const envResult = await parseEnv(options);
    if (envResult.isErr()) {
      logEnvParseError(log, envResult.error);
      return ResultCodes.Error;
    }
    const env = envResult.value;

    const tryRemoveFromManifest = async function (
      manifest: UnityProjectManifest,
      pkg: PackageReference
    ): Promise<Result<UnityProjectManifest, RemoveError>> {
      // parse name
      if (hasVersion(pkg)) {
        const [name] = splitPackageReference(pkg);
        log.warn("", `please do not specify a version (Write only '${name}').`);
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
    const manifestResult = await loadProjectManifest(env.cwd).promise;
    if (manifestResult.isErr()) {
      logManifestLoadError(log, manifestResult.error);
      return ResultCodes.Error;
    }
    let manifest = manifestResult.value;

    // remove
    for (const pkg of pkgs) {
      const result = await tryRemoveFromManifest(manifest, pkg);
      if (result.isErr()) return ResultCodes.Error;
      manifest = result.value;
    }

    // save manifest
    const saveResult = await writeProjectManifest(env.cwd, manifest).promise;
    if (saveResult.isErr()) {
      logManifestSaveError(log, saveResult.error);
      return ResultCodes.Error;
    }

    // print manifest notice
    log.notice("", "please open Unity project to apply changes");

    return ResultCodes.Ok;
  };
}
