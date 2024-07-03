import { ParseEnv } from "../services/parse-env";
import { makePackageReference } from "../domain/package-reference";
import { CmdOptions } from "./options";
import { Logger } from "npmlog";
import { ResultCodes } from "./result-codes";
import { notifyPackumentNotFoundInManifest } from "./error-logging";
import { DomainName } from "../domain/domain-name";
import { RemovePackages } from "../services/remove-packages";

/**
 * The possible result codes with which the remove command can exit.
 */
export type RemoveResultCode = ResultCodes.Ok | ResultCodes.Error;

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
  parseEnv: ParseEnv,
  removePackages: RemovePackages,
  log: Logger
): RemoveCmd {
  return async (pkgs, options) => {
    // parse env
    const env = await parseEnv(options);

    const removeResult = await removePackages(env.cwd, pkgs).promise;
    if (removeResult.isErr()) {
      notifyPackumentNotFoundInManifest(log, removeResult.error.packageName);
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
