import { createCommand } from "@commander-js/extra-typings";
import pkginfo from "pkginfo";
import updateNotifier from "update-notifier";
import { remove } from "./cmd-remove";
import { search } from "./cmd-search";
import { view } from "./cmd-view";
import { deps } from "./cmd-deps";
import { login } from "./cmd-login";
import log from "./logger";
import { eachValue, mustBeParsable, mustSatisfy } from "./cli-parsing";
import { isPackageReference } from "../domain/package-reference";
import { isDomainName } from "../domain/domain-name";
import { coerceRegistryUrl } from "../domain/registry-url";
import { CmdOptions } from "./options";

// update-notifier
import pkg from "../../package.json";
import { makePackumentFetchService } from "../services/fetch-packument";
import { makeAddCmd } from "./cmd-add";

// Composition root

const fetchService = makePackumentFetchService();
const addCmd = makeAddCmd(fetchService);

// Validators

const mustBePackageReference = mustSatisfy(
  isPackageReference,
  (input) => `"${input}" is not a valid package-reference`
);

const mustBeDomainName = mustSatisfy(
  isDomainName,
  (input) => `"${input}" is not a valid package name`
);

const mustBeRegistryUrl = mustBeParsable(
  coerceRegistryUrl,
  (input) => `"${input}" is not a valid registry-url`
);

pkginfo(module);
const notifier = updateNotifier({ pkg });
notifier.notify();

const program = createCommand()
  .version(module.exports.version)
  .option("-c, --chdir <path>", "change the working directory")
  .option("-r, --registry <url>", "specify registry url", mustBeRegistryUrl)
  .option("-v, --verbose", "output extra debugging")
  .option("--cn", "use the China region registry")
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
    const addResult = await addCmd(pkgs, makeCmdOptions(options));
    if (addResult.isErr()) process.exit(1);
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
  .action(async function (pkg, otherPkgs, options) {
    const pkgs = [pkg].concat(otherPkgs);
    const removeResult = await remove(pkgs, makeCmdOptions(options));
    if (removeResult.isErr()) process.exit(1);
  });

program
  .command("search")
  .argument("<keyword>", "The keyword to search")
  .aliases(["s", "se", "find"])
  .description("Search package by keyword")
  .action(async function (keyword, options) {
    const searchResult = await search(keyword, makeCmdOptions(options));
    if (searchResult.isErr()) process.exit(1);
  });

program
  .command("view")
  .argument("<pkg>", "Reference to a package", mustBePackageReference)
  .aliases(["v", "info", "show"])
  .description("view package information")
  .action(async function (pkg, options) {
    const result = await view(pkg, makeCmdOptions(options));
    if (result.isErr()) process.exit(1);
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
    const depsResult = await deps(pkg, makeCmdOptions(options));
    if (depsResult.isErr()) process.exit(1);
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
    const loginResult = await login(makeCmdOptions(options));
    if (loginResult.isErr()) process.exit(1);
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
