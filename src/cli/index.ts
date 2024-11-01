import { createCommand, Option } from "@commander-js/extra-typings";
import chalk from "chalk";
import type { Logger } from "npmlog";
import packageJson from "../../package.json" with { type: "json" };
import type { DebugLog } from "../domain/logging.js";
import { getHomePathFromEnv } from "../domain/special-paths.js";
import { readTextFile, writeTextFile } from "../io/fs.js";
import {
  type GetAllRegistryPackuments,
  type GetAuthToken,
  type GetRegistryPackument,
  type SearchRegistry,
} from "../io/registry.js";
import { fetchCheckUrlExists } from "../io/www.js";
import { makeAddCmd } from "./cmd-add.js";
import { makeDepsCmd } from "./cmd-deps.js";
import { makeLoginCmd } from "./cmd-login.js";
import { makeLsCmd } from "./cmd-ls.js";
import { makeRemoveCmd } from "./cmd-remove.js";
import { makeSearchCmd } from "./cmd-search.js";
import { makeViewCmd } from "./cmd-view.js";

const verboseOpt = new Option(
  "-v, --verbose",
  "output extra debugging"
).default(false);

const colorOpt = new Option("--no-color", "disable color").default(true);

/**
 * Makes the openupm cli app with the given dependencies.
 * @param fetchPackument IO function for fetching registry packuments.
 * @param searchRegistry IO function for using the search API on a registry.
 * @param fetchAllPackuments IO function for getting all packuments from
 * a registry.
 * @param getAuthToken IO function for getting a users auth token from a
 * registry.
 * @param log Logger for printing output.
 * @param debugLog IO function for printing debug logs.
 * @returns Root command.
 */
export function makeOpenupmCli(
  fetchPackument: GetRegistryPackument,
  searchRegistry: SearchRegistry,
  fetchAllPackuments: GetAllRegistryPackuments,
  getAuthToken: GetAuthToken,
  log: Logger,
  debugLog: DebugLog
) {
  const homePath = getHomePathFromEnv(process.env);

  const program = createCommand()
    .version(packageJson.version)
    .addOption(verboseOpt)
    .addOption(colorOpt);

  program.on("option:verbose", function () {
    const verbose = program.opts().verbose;
    log.level = verbose ? "verbose" : "notice";
  });

  program.on(`option:${colorOpt.name()}`, function () {
    const useColor = program.opts().color && process.env["NODE_ENV"] !== "test";

    if (!useColor) {
      chalk.level = 0;
      log.disableColor();
    }
  });

  program.addCommand(
    makeAddCmd(
      fetchCheckUrlExists,
      fetchPackument,
      readTextFile,
      writeTextFile,
      log,
      debugLog
    )
  );

  program.addCommand(makeRemoveCmd(readTextFile, writeTextFile, debugLog, log));

  program.addCommand(
    makeSearchCmd(
      readTextFile,
      searchRegistry,
      fetchAllPackuments,
      log,
      debugLog
    )
  );

  program.addCommand(makeViewCmd(fetchPackument, readTextFile, debugLog, log));

  program.addCommand(
    makeDepsCmd(
      readTextFile,
      fetchPackument,
      fetchCheckUrlExists,
      log,
      debugLog
    )
  );

  program.addCommand(
    makeLoginCmd(
      homePath,
      getAuthToken,
      readTextFile,
      writeTextFile,
      debugLog,
      log
    )
  );

  program.addCommand(makeLsCmd(readTextFile, debugLog, log));

  // prompt for invalid command
  program.on("command:*", function () {
    log.warn("", `unknown command: ${program.args.join(" ")}`);
    log.warn("", "see --help for a list of available commands");
    process.exit(1);
  });

  return program;
}
