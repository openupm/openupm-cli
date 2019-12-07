const program = require("commander");
const add = require("./cmd-add");
const remove = require("./cmd-remove");
const search = require("./cmd-search");
require("pkginfo")(module);

program
  .version(module.exports.version)
  .option("-c, --chdir <path>", "change the working directory")
  .option("-r, --registry <url>", "specify registry url")
  .option("-v, --verbose", "output extra debugging");

program
  .command("add <pkg> [otherPkgs...]")
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
  .alias("rm")
  .description("remove package from manifest json")
  .action(async function(pkg, otherPkgs, options) {
    const pkgs = [pkg].concat(otherPkgs);
    const retCode = await remove(pkgs, options);
    if (retCode) process.exit(retCode);
  });

program
  .command("search <keyword>")
  .alias("s")
  .description("Search package by keyword")
  .action(async function(keyword, options) {
    const retCode = await search(keyword, options);
    if (retCode) process.exit(retCode);
  });

program.parse(process.argv);
