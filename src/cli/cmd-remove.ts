import { Argument, Command } from "@commander-js/extra-typings";
import { Logger } from "npmlog";
import { removeDependenciesUsing } from "../app/remove-dependencies";
import { partialApply } from "../domain/fp-utils";
import type { DebugLog } from "../domain/logging";
import { makePackageSpec } from "../domain/package-spec";
import type { ReadTextFile, WriteTextFile } from "../io/fs";
import { eachValue } from "./cli-parsing";
import { logError, withErrorLogger } from "./error-logging";
import { workDirOpt } from "./opt-wd";
import { ResultCodes } from "./result-codes";
import { mustBeDomainName } from "./validators";

const packageNameArg = new Argument(
  "<pkg>",
  "Name of the package to remove"
).argParser(mustBeDomainName);

const otherPackageNamesArg = new Argument(
  "[otherPkgs...]",
  "Names of additional packages to remove"
).argParser(eachValue(mustBeDomainName));

/**
 * Makes the `openupm remove` cli command with the given dependencies.
 * @param readTextFile IO function for reading a text file.
 * @param writeTextFile IO function for writing a text file.
 * @param debugLog IO function for debug-logs.
 * @param log Logger for cli output.
 * @returns The command.
 */
export function makeRemoveCmd(
  readTextFile: ReadTextFile,
  writeTextFile: WriteTextFile,
  debugLog: DebugLog,
  log: Logger
) {
  const removeDependencies = partialApply(
    removeDependenciesUsing,
    readTextFile,
    writeTextFile,
    debugLog
  );

  return new Command("remove")
    .aliases(["rm", "uninstall"])
    .addArgument(packageNameArg)
    .addArgument(otherPackageNamesArg)
    .addOption(workDirOpt)
    .description("remove package from manifest json")
    .action(
      withErrorLogger(
        log,
        async function (packageName, otherPackageNames, options) {
          const packageNames = [packageName, ...otherPackageNames];

          const projectDir = options.chdir;

          const removeResult = await removeDependencies(
            projectDir,
            packageNames
          ).promise;
          if (removeResult.isErr()) {
            logError(log, removeResult.error);
            return process.exit(ResultCodes.Error);
          }
          const removedPackages = removeResult.value;

          removedPackages.forEach((removedPackage) => {
            log.notice(
              "",
              `Removed "${makePackageSpec(
                removedPackage.name,
                removedPackage.version
              )}".`
            );
          });

          // print manifest notice
          log.notice("", "please open Unity project to apply changes");
        }
      )
    );
}
