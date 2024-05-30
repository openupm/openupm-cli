import {
  ManifestLoadError,
  ManifestWriteError,
} from "../io/project-manifest-io";
import { EnvParseError, ParseEnvService } from "../services/parse-env";
import { makePackageReference } from "../domain/package-reference";
import { CmdOptions } from "./options";

import {
  PackageWithVersionError,
  PackumentNotFoundError,
} from "../common-errors";
import { Logger } from "npmlog";
import { ResultCodes } from "./result-codes";
import {
  notifyEnvParsingFailed,
  notifyPackageRemoveFailed,
} from "./error-logging";
import { DomainName } from "../domain/domain-name";
import { RemovePackages } from "../services/remove-packages";

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
 * @param pkgs One or multiple packages to remove.
 * @param options Command options.
 */
export type RemoveCmd = (
  pkgs: ReadonlyArray<DomainName>,
  options: RemoveOptions
) => Promise<RemoveResultCode>;

/**
 * Makes a {@link RemoveCmd} function.
 */
export function makeRemoveCmd(
  parseEnv: ParseEnvService,
  removePackages: RemovePackages,
  log: Logger
): RemoveCmd {
  return async (pkgs, options) => {
    // parse env
    const envResult = await parseEnv(options);
    if (envResult.isErr()) {
      notifyEnvParsingFailed(log, envResult.error);
      return ResultCodes.Error;
    }
    const env = envResult.value;

    const removeResult = await removePackages(env.cwd, pkgs).promise;
    if (removeResult.isErr()) {
      notifyPackageRemoveFailed(log, removeResult.error);
      return ResultCodes.Error;
    }
    const removedPackages = removeResult.value;

    removedPackages.forEach((removedPackage) => {
      log.notice(
        "",
        `Removed "${makePackageReference(
          removedPackage.name,
          removedPackage.version
        )}".`
      );
    });

    // print manifest notice
    log.notice("", "please open Unity project to apply changes");

    return ResultCodes.Ok;
  };
}
