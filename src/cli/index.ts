import { createCommand, Option } from "@commander-js/extra-typings";
import type { Logger } from "npmlog";
import pkginfo from "pkginfo";
import type { DebugLog } from "../domain/logging";
import { getHomePathFromEnv } from "../domain/special-paths";
import { readTextFile, writeTextFile } from "../io/fs";
import {
  type GetAllRegistryPackuments,
  type GetAuthToken,
  type GetRegistryPackument,
  type SearchRegistry,
} from "../io/registry";
import { fetchCheckUrlExists } from "../io/www";
import { makeAddCmd } from "./cmd-add";
import { makeDepsCmd } from "./cmd-deps";
import { makeLoginCmd } from "./cmd-login";
import { makeRemoveCmd } from "./cmd-remove";
import { makeSearchCmd } from "./cmd-search";
import { makeViewCmd } from "./cmd-view";

const verboseOpt = new Option(
  "-v, --verbose",
  "output extra debugging"
).default(false);

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

  pkginfo(module);
  const program = createCommand()
    .version(module.exports.version)
    .addOption(verboseOpt)
    .option("--system-user", "auth for Windows system user")
    .option("--no-upstream", "don't use upstream unity registry")
    .option("--no-color", "disable color");

  program.on("option:verbose", function () {
    const verbose = program.opts().verbose;
    log.level = verbose ? "verbose" : "notice";
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

  // prompt for invalid command
  program.on("command:*", function () {
    log.warn("", `unknown command: ${program.args.join(" ")}`);
    log.warn("", "see --help for a list of available commands");
    process.exit(1);
  });

  return program;
}
