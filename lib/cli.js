const program = require("commander");
const add = require("./cmd-add");
const remove = require("./cmd-remove");
const search = require("./cmd-search");
const view = require("./cmd-view");
const deps = require("./cmd-deps");
const { login } = require("./cmd-login");
const { log } = require("./logger");
require("pkginfo")(module);

// update-notifier
const updateNotifier = require("update-notifier");
const pkg = require("../package.json");
const notifier = updateNotifier({ pkg });
notifier.notify();

program
  .version(module.exports.version)
  .option("-c, --chdir <path>", "change the working directory")
  .option("-r, --registry <url>", "specify registry url")
  .option("-v, --verbose", "output extra debugging")
  .option("--system-user", "auth for Windows system user")
  .option("--wsl", "auth for Windows when using WSL")
  .option("--no-upstream", "don't use upstream unity registry")
  .option("--no-color", "disable color");

program
  .command("add <pkg> [otherPkgs...]")
  .aliases(["install", "i"])
  .option("-t, --test", "add package as testable")
  .description(
    `add package to manifest json
openupm add <pkg> [otherPkgs...]
openupm add <pkg>@<version> [otherPkgs...]`
  )
  .action(async function(pkg, otherPkgs, options) {
    const pkgs = [pkg].concat(otherPkgs);
    const retCode = await add(pkgs, options);
    if (retCode) process.exit(retCode);
  });

program
  .command("remove <pkg> [otherPkgs...]")
  .aliases(["rm", "uninstall"])
  .description("remove package from manifest json")
  .action(async function(pkg, otherPkgs, options) {
    const pkgs = [pkg].concat(otherPkgs);
    const retCode = await remove(pkgs, options);
    if (retCode) process.exit(retCode);
  });

program
  .command("search <keyword>")
  .aliases(["s", "se", "find"])
  .option("--clean-cache", "clean local cache before search")
  .description("Search package by keyword")
  .action(async function(keyword, options) {
    const retCode = await search(keyword, options);
    if (retCode) process.exit(retCode);
  });

program
  .command("view <pkg>")
  .aliases(["v", "info", "show"])
  .description("view package information")
  .action(async function(pkg, options) {
    const retCode = await view(pkg, options);
    if (retCode) process.exit(retCode);
  });

program
  .command("deps <pkg>")
  .alias("dep")
  .option("-d, --deep", "view package dependencies recursively")
  .description(
    `view package dependencies
openupm deps <pkg>
openupm deps <pkg>@<version>`
  )
  .action(async function(pkg, options) {
    const retCode = await deps(pkg, options);
    if (retCode) process.exit(retCode);
  });

program
  .command("login")
  .aliases(["add-user", "adduser"])
  .option("-u, --username <username>", "username")
  .option("-p, --password <password>", "password")
  .option("-e, --email <email>", "email address")
  .option("-r, --registry <url>", "registry url")
  .option("--basic-auth", "use basic authentication instead of token")
  .option(
    "--always-auth",
    "always auth for tarball hosted on a different domain"
  )
  .description("authenticate with a scoped registry")
  .action(async function(options) {
    try {
      const retCode = await login(options);
      if (retCode) process.exit(retCode);
    } catch (err) {
      log.error("", err.message);
      process.exit(1);
    }
  });

// prompt for invalid command
program.on("command:*", function() {
  log.warn("", `unknown command: ${program.args.join(" ")}`);
  log.warn("", "see --help for a list of available commands");
  process.exit(1);
});

program.parse(process.argv);

// print help if no command is given
if (!program.args.length) program.help();
