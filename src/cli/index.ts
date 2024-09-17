import { createCommand } from "@commander-js/extra-typings";
import RegClient from "another-npm-registry-client";
import npmlog from "npmlog";
import pkginfo from "pkginfo";
import updateNotifier from "update-notifier";
import pkg from "../../package.json";
import { DebugLog } from "../domain/logging";
import { getHomePathFromEnv } from "../domain/special-paths";
import { readTextFile, writeTextFile } from "../io/fs";
import {
  getAllRegistryPackumentsUsing,
  getAuthTokenUsing,
  getRegistryPackumentUsing,
  searchRegistryUsing,
} from "../io/registry";
import { fetchCheckUrlExists } from "../io/www";
import { makeAddCmd } from "./cmd-add";
import { makeDepsCmd } from "./cmd-deps";
import { makeLoginCmd } from "./cmd-login";
import { makeRemoveCmd } from "./cmd-remove";
import { makeSearchCmd } from "./cmd-search";
import { makeViewCmd } from "./cmd-view";
import { withErrorLogger } from "./error-logging";
import { CmdOptions } from "./options";
import { mustBePackageReference, mustBeRegistryUrl } from "./validators";

// Composition root

const log = npmlog;

/**
 * {@link DebugLog} function which uses {@link npmlog} to print logs to
 * the console.
 */
const debugLogToConsole: DebugLog = async function (message, context) {
  const contextMessage =
    context !== undefined
      ? `\n${
          context instanceof Error
            ? context.toString()
            : JSON.stringify(context, null, 2)
        }`
      : "";
  return log.verbose("", `${message}${contextMessage}`);
};

const homePath = getHomePathFromEnv(process.env);
const registryClient = new RegClient({ log });
const fetchPackument = getRegistryPackumentUsing(
  registryClient,
  debugLogToConsole
);
const searchRegistry = searchRegistryUsing(debugLogToConsole);
const fetchAllPackuments = getAllRegistryPackumentsUsing(debugLogToConsole);

const viewCmd = makeViewCmd(
  getRegistryPackumentUsing(registryClient, debugLogToConsole),
  readTextFile,
  debugLogToConsole,
  log
);

// update-notifier

pkginfo(module);
const notifier = updateNotifier({ pkg });
notifier.notify();

const program = createCommand()
  .version(module.exports.version)
  .option("-c, --chdir <path>", "change the working directory")
  .option("-r, --registry <url>", "specify registry url", mustBeRegistryUrl)
  .option("-v, --verbose", "output extra debugging")
  .option("--system-user", "auth for Windows system user")
  .option("--no-upstream", "don't use upstream unity registry")
  .option("--no-color", "disable color");

/**
 * Creates a CmdOptions object by adding global options to the given
 * specific options.
 * @param specificOptions The specific options.
 */
function makeCmdOptions<T extends Record<string, unknown>>(
  specificOptions: T
): CmdOptions<T> {
  return { ...specificOptions, ...program.opts() };
}

program.addCommand(
  makeAddCmd(
    fetchCheckUrlExists,
    fetchPackument,
    readTextFile,
    writeTextFile,
    log,
    debugLogToConsole
  )
);

program.addCommand(
  makeRemoveCmd(readTextFile, writeTextFile, debugLogToConsole, log)
);

program.addCommand(
  makeSearchCmd(
    readTextFile,
    searchRegistry,
    fetchAllPackuments,
    log,
    debugLogToConsole
  )
);

program
  .command("view")
  .argument("<pkg>", "Reference to a package", mustBePackageReference)
  .aliases(["v", "info", "show"])
  .description("view package information")
  .action(
    withErrorLogger(log, async function (pkg, options) {
      const resultCode = await viewCmd(pkg, makeCmdOptions(options));
      process.exit(resultCode);
    })
  );

program.addCommand(
  makeDepsCmd(
    readTextFile,
    fetchPackument,
    fetchCheckUrlExists,
    log,
    debugLogToConsole
  )
);

program.addCommand(
  makeLoginCmd(
    homePath,
    getAuthTokenUsing(registryClient, debugLogToConsole),
    readTextFile,
    writeTextFile,
    debugLogToConsole,
    log
  )
);

// prompt for invalid command
program.on("command:*", function () {
  log.warn("", `unknown command: ${program.args.join(" ")}`);
  log.warn("", "see --help for a list of available commands");
  process.exit(1);
});

program.parse(process.argv);

// print help if no command is given
if (!program.args.length) program.help();
