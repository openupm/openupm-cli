import { Command } from "@commander-js/extra-typings";
import { Logger } from "npmlog";
import type { DebugLog } from "../domain/logging";
import type { ReadTextFile } from "../io/fs";
import { withErrorLogger } from "./error-logging";

/**
 * Makes the `openupm ls` cli command with the given dependencies.
 * @param readTextFile IO function for reading a text file.
 * @param debugLog IO function for debug-logs.
 * @param log Logger for cli output.
 * @returns The command.
 */
export function makeLsCmd(
  readTextFile: ReadTextFile,
  debugLog: DebugLog,
  log: Logger
) {
  return new Command("ls")
    .aliases(["list"])
    .summary("list all currently installed packages")
    .description(
      `Print the names and versions of all installed packages.
openupm ls`
    )
    .action(withErrorLogger(log, async function (options) {}));
}
