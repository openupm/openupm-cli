import { createCommand } from "@commander-js/extra-typings";
import pkginfo from "pkginfo";
import updateNotifier from "update-notifier";
import { makeRemoveCmd } from "./cmd-remove";
import { makeDepsCmd } from "./cmd-deps";
import { makeLoginCmd } from "./cmd-login";
import { eachValue } from "./cli-parsing";
import { CmdOptions } from "./options";
import { makeAddCmd } from "./cmd-add";
import { makeAuthNpmrc } from "../services/npmrc-auth";
import { makeNpmLogin } from "../services/npm-login";
import { makeSearchRegistry } from "../io/npm-search";
import pkg from "../../package.json";
import { makeSearchCmd } from "./cmd-search";
import { makeViewCmd } from "./cmd-view";
import { makeResolveDependency } from "../services/dependency-resolving";
import { makeFetchAllPackuments } from "../io/all-packuments-io";
import {
  mustBeDomainName,
  mustBePackageReference,
  mustBeRegistryUrl,
} from "./validators";
import RegClient from "another-npm-registry-client";
import { makeParseEnv } from "../services/parse-env";
import { makeResolveRemotePackumentVersion } from "../services/resolve-remote-packument-version";
import {
  makeLoadProjectManifest,
  makeWriteProjectManifest,
} from "../io/project-manifest-io";
import npmlog from "npmlog";
import { makeResolveLatestVersion } from "../services/resolve-latest-version";
import {
  makeGetUpmConfigPath,
  makeLoadUpmConfig,
  makeSaveUpmConfig,
} from "../io/upm-config-io";
import { makeReadText, makeWriteText } from "../io/fs-result";
import {
  makeFindNpmrcPath,
  makeLoadNpmrc,
  makeSaveNpmrc,
} from "../io/npmrc-io";
import { makeGetCwd, makeGetHomePath } from "../io/special-paths";
import { makeLoadProjectVersion } from "../io/project-version-io";
import { makeSaveAuthToUpmConfig } from "../services/upm-auth";
import { makeFetchPackument } from "../io/packument-io";
import { makeSearchPackages } from "../services/search-packages";
import { makeLogin } from "../services/login";
import { DebugLog } from "../logging";
import { makeDetermineEditorVersion } from "../services/determine-editor-version";
import { makeRemovePackages } from "../services/remove-packages";
import { makeRunChildProcess } from "../io/child-process";
import { makeCheckIsBuiltInPackage } from "../services/built-in-package-check";
import { makeCheckIsUnityPackage } from "../services/unity-package-check";
import { makeCheckUrlExists } from "../io/check-url";

// Composition root

const log = npmlog;
const debugLog: DebugLog = (message, context) =>
  log.verbose(
    "openupm-cli",
    `${message}${
      context !== undefined ? ` context: ${JSON.stringify(context)}` : ""
    }`
  );
const regClient = new RegClient({ log });
const getCwd = makeGetCwd();
const runChildProcess = makeRunChildProcess(debugLog);
const getHomePath = makeGetHomePath();
const readFile = makeReadText(debugLog);
const writeFile = makeWriteText(debugLog);
const loadProjectManifest = makeLoadProjectManifest(readFile);
const writeProjectManifest = makeWriteProjectManifest(writeFile);
const getUpmConfigPath = makeGetUpmConfigPath(getHomePath, runChildProcess);
const loadUpmConfig = makeLoadUpmConfig(readFile);
const saveUpmConfig = makeSaveUpmConfig(writeFile);
const findNpmrcPath = makeFindNpmrcPath(getHomePath);
const loadNpmrc = makeLoadNpmrc(readFile);
const saveNpmrc = makeSaveNpmrc(writeFile);
const loadProjectVersion = makeLoadProjectVersion(readFile);
const fetchPackument = makeFetchPackument(regClient);
const fetchAllPackuments = makeFetchAllPackuments(debugLog);
const searchRegistry = makeSearchRegistry(debugLog);
const removePackages = makeRemovePackages(
  loadProjectManifest,
  writeProjectManifest
);
const checkUrlExists = makeCheckUrlExists();

const parseEnv = makeParseEnv(log, getUpmConfigPath, loadUpmConfig, getCwd);
const determineEditorVersion = makeDetermineEditorVersion(loadProjectVersion);
const authNpmrc = makeAuthNpmrc(findNpmrcPath, loadNpmrc, saveNpmrc);
const npmLogin = makeNpmLogin(regClient, debugLog);
const resolveRemovePackumentVersion =
  makeResolveRemotePackumentVersion(fetchPackument);
const resolveLatestVersion = makeResolveLatestVersion(fetchPackument);
const checkIsUnityPackage = makeCheckIsUnityPackage(checkUrlExists);
const checkIsBuiltInPackage = makeCheckIsBuiltInPackage(
  checkIsUnityPackage,
  fetchPackument
);
const resolveDependencies = makeResolveDependency(
  resolveRemovePackumentVersion,
  resolveLatestVersion,
  checkIsBuiltInPackage
);
const saveAuthToUpmConfig = makeSaveAuthToUpmConfig(
  loadUpmConfig,
  saveUpmConfig
);
const searchPackages = makeSearchPackages(searchRegistry, fetchAllPackuments);
const login = makeLogin(saveAuthToUpmConfig, npmLogin, authNpmrc, debugLog);

const addCmd = makeAddCmd(
  parseEnv,
  resolveRemovePackumentVersion,
  resolveDependencies,
  loadProjectManifest,
  writeProjectManifest,
  determineEditorVersion,
  log,
  debugLog
);
const loginCmd = makeLoginCmd(parseEnv, getUpmConfigPath, login, log);
const searchCmd = makeSearchCmd(parseEnv, searchPackages, log, debugLog);
const depsCmd = makeDepsCmd(parseEnv, resolveDependencies, log, debugLog);
const removeCmd = makeRemoveCmd(parseEnv, removePackages, log);
const viewCmd = makeViewCmd(parseEnv, fetchPackument, log);

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
  return { ...specificOptions, _global: program.opts() };
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
  .action(async function (pkg, otherPkgs, options) {
    const pkgs = [pkg].concat(otherPkgs);
    const resultCode = await addCmd(pkgs, makeCmdOptions(options));
    process.exit(resultCode);
  });

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
  .action(async function (packageName, otherPackageNames, options) {
    const packageNames = [packageName].concat(otherPackageNames);
    const resultCode = await removeCmd(packageNames, makeCmdOptions(options));
    process.exit(resultCode);
  });

program
  .command("search")
  .argument("<keyword>", "The keyword to search")
  .aliases(["s", "se", "find"])
  .description("Search package by keyword")
  .action(async function (keyword, options) {
    const resultCode = await searchCmd(keyword, makeCmdOptions(options));
    process.exit(resultCode);
  });

program
  .command("view")
  .argument("<pkg>", "Reference to a package", mustBePackageReference)
  .aliases(["v", "info", "show"])
  .description("view package information")
  .action(async function (pkg, options) {
    const resultCode = await viewCmd(pkg, makeCmdOptions(options));
    process.exit(resultCode);
  });

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
  .action(async function (pkg, options) {
    const resultCode = await depsCmd(pkg, makeCmdOptions(options));
    process.exit(resultCode);
  });

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
  .action(async function (options) {
    const resultCode = await loginCmd(makeCmdOptions(options));
    process.exit(resultCode);
  });

// prompt for invalid command
program.on("command:*", function () {
  log.warn("", `unknown command: ${program.args.join(" ")}`);
  log.warn("", "see --help for a list of available commands");
  process.exit(1);
});

program.parse(process.argv);

// print help if no command is given
if (!program.args.length) program.help();
