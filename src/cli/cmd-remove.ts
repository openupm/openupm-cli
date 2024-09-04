import { Logger } from "npmlog";
import { ParseEnv } from "./parse-env";
import { removeDependenciesUsing } from "../app/remove-dependencies";
import { DomainName } from "../domain/domain-name";
import { makePackageReference } from "../domain/package-reference";
import type { ReadTextFile, WriteTextFile } from "../io/text-file-io";
import type { DebugLog } from "../logging";
import { partialApply } from "../utils/fp-utils";
import { logError } from "./error-logging";
import { CmdOptions } from "./options";
import { ResultCodes } from "./result-codes";

/**
 * The possible result codes with which the remove command can exit.
 */
export type RemoveResultCode = ResultCodes.Ok | ResultCodes.Error;

/**
 * Options passed to the remove command.
 */
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
  readTextFile: ReadTextFile,
  writeTextFile: WriteTextFile,
  debugLog: DebugLog,
  log: Logger
): RemoveCmd {
  const removeDependencies = partialApply(
    removeDependenciesUsing,
    readTextFile,
    writeTextFile,
    debugLog
  );

  return async (pkgs, options) => {
    // parse env
    const env = await parseEnv(options);

    const removeResult = await removeDependencies(env.cwd, pkgs).promise;
    if (removeResult.isErr()) {
      logError(log, removeResult.error);
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
