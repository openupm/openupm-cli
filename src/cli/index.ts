import { createCommand } from "@commander-js/extra-typings";
import npmlog from "npmlog";
import pkginfo from "pkginfo";
import updateNotifier from "update-notifier";
import pkg from "../../package.json";
import { getRegistryPackument } from "../io/packument-io";
import {
  loadProjectManifest,
  saveProjectManifest,
} from "../io/project-manifest-io";
import { getProcessCwd } from "../io/special-paths";
import { getUpmConfigPath } from "../io/upm-config-io";
import { npmDebugLog } from "../logging";
import { resolveDependencies } from "../services/dependency-resolving";
import { determineEditorVersion } from "../services/determine-editor-version";
import { getAuthToken } from "../services/get-auth-token";
import { getLatestVersion } from "../services/get-latest-version";
import { getRegistryAuth } from "../services/get-registry-auth";
import { getRegistryPackumentVersion } from "../services/get-registry-packument-version";
import { makeLogin } from "../services/login";
import { makeParseEnv } from "../services/parse-env";
import { putNpmAuthToken } from "../services/put-npm-auth-token";
import { putRegistryAuth } from "../services/put-registry-auth";
import { removePackages } from "../services/remove-packages";
import { searchPackages } from "../services/search-packages";
import { eachValue } from "./cli-parsing";
import { makeAddCmd } from "./cmd-add";
import { makeDepsCmd } from "./cmd-deps";
import { makeLoginCmd } from "./cmd-login";
import { makeRemoveCmd } from "./cmd-remove";
import { makeSearchCmd } from "./cmd-search";
import { makeViewCmd } from "./cmd-view";
import { withErrorLogger } from "./error-logging";
import { CmdOptions } from "./options";
import {
  mustBeDomainName,
  mustBePackageReference,
  mustBeRegistryUrl,
} from "./validators";

// Composition root

const log = npmlog;

const parseEnv = makeParseEnv(
  log,
  getUpmConfigPath,
  getRegistryAuth,
  getProcessCwd,
  npmDebugLog
);

const login = makeLogin(
  putRegistryAuth,
  getAuthToken,
  putNpmAuthToken,
  npmDebugLog
);

const addCmd = makeAddCmd(
  parseEnv,
  getRegistryPackumentVersion,
  resolveDependencies,
  loadProjectManifest,
  saveProjectManifest,
  determineEditorVersion,
  log,
  npmDebugLog
);
const loginCmd = makeLoginCmd(parseEnv, getUpmConfigPath, login, log);
const searchCmd = makeSearchCmd(parseEnv, searchPackages, log, npmDebugLog);
const depsCmd = makeDepsCmd(
  parseEnv,
  resolveDependencies,
  getLatestVersion,
  log,
  npmDebugLog
);
const removeCmd = makeRemoveCmd(parseEnv, removePackages, log);
const viewCmd = makeViewCmd(parseEnv, getRegistryPackument, log);

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
  .option("--wsl", "auth for Windows when using WSL")
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

program
  .command("add")
  .argument(
    "<pkg>",
    "Reference to the package that should be added",
    mustBePackageReference
  )
  .argument(
    "[otherPkgs...]",
    "References to additional packages that should be added",
    eachValue(mustBePackageReference)
  )
  .aliases(["install", "i"])
  .option("-t, --test", "add package as testable")
  .option(
    "-f, --force",
    "force add package if missing deps or editor version is not qualified"
  )
  .description(
    `add package to manifest json
openupm add <pkg> [otherPkgs...]
openupm add <pkg>@<version> [otherPkgs...]`
  )
  .action(
    withErrorLogger(log, async function (pkg, otherPkgs, options) {
      const pkgs = [pkg].concat(otherPkgs);
      const resultCode = await addCmd(pkgs, makeCmdOptions(options));
      process.exit(resultCode);
    })
  );

program
  .command("remove")
  .argument("<pkg>", "Name of the package to remove", mustBeDomainName)
  .argument(
    "[otherPkgs...]",
    "Names of additional packages to remove",
    eachValue(mustBeDomainName)
  )
  .aliases(["rm", "uninstall"])
  .description("remove package from manifest json")
  .action(
    withErrorLogger(
      log,
      async function (packageName, otherPackageNames, options) {
        const packageNames = [packageName].concat(otherPackageNames);
        const resultCode = await removeCmd(
          packageNames,
          makeCmdOptions(options)
        );
        process.exit(resultCode);
      }
    )
  );

program
  .command("search")
  .argument("<keyword>", "The keyword to search")
  .aliases(["s", "se", "find"])
  .description("Search package by keyword")
  .action(
    withErrorLogger(log, async function (keyword, options) {
      const resultCode = await searchCmd(keyword, makeCmdOptions(options));
      process.exit(resultCode);
    })
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

program
  .command("deps")
  .argument("<pkg>", "Reference to a package", mustBePackageReference)
  .alias("dep")
  .option("-d, --deep", "view package dependencies recursively")
  .description(
    `view package dependencies
openupm deps <pkg>
openupm deps <pkg>@<version>`
  )
  .action(
    withErrorLogger(log, async function (pkg, options) {
      const resultCode = await depsCmd(pkg, makeCmdOptions(options));
      process.exit(resultCode);
    })
  );

program
  .command("login")
  .aliases(["add-user", "adduser"])
  .option("-u, --username <username>", "username")
  .option("-p, --password <password>", "password")
  .option("-e, --email <email>", "email address")
  .option("--basic-auth", "use basic authentication instead of token")
  .option(
    "--always-auth",
    "always auth for tarball hosted on a different domain"
  )
  .description("authenticate with a scoped registry")
  .action(
    withErrorLogger(log, async function (options) {
      const resultCode = await loginCmd(makeCmdOptions(options));
      process.exit(resultCode);
    })
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
