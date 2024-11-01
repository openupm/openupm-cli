import { Command } from "@commander-js/extra-typings";
import { Logger } from "npmlog";
import { loadProjectManifestUsing } from "../app/get-dependencies.js";
import { partialApply } from "../domain/fp-utils.js";
import type { DebugLog } from "../domain/logging.js";
import { makePackageSpec } from "../domain/package-spec.js";
import { recordEntries } from "../domain/record-utils.js";
import type { ReadTextFile } from "../io/fs.js";
import { withErrorLogger } from "./error-logging.js";
import { workDirOpt } from "./opt-wd.js";

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
  const getDependencies = partialApply(
    loadProjectManifestUsing,
    readTextFile,
    debugLog
  );

  return new Command("ls")
    .aliases(["list"])
    .summary("list all currently installed packages")
    .description(
      `Print the names and versions of all installed packages.
openupm ls`
    )
    .addOption(workDirOpt)
    .action(
      withErrorLogger(log, async function (options) {
        const projectDirectory = options.chdir;
        const manifest = await getDependencies(projectDirectory);

        const dependencies = recordEntries(manifest.dependencies ?? {});

        dependencies.forEach(([name, version]) => {
          log.notice("", makePackageSpec(name, version));
        });
      })
    );
}
