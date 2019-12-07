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
  .command("add <pkg>")
  .description(
    `add package to manifest json
openupm add <pkg>
openupm add <pkg>@<version>`
  )
  .action(async function(pkg, options) {
    const retCode = await add(pkg, options);
    if (retCode) process.exit(retCode);
  });

program
  .command("remove <pkg>")
  .alias("rm")
  .description("remove package from manifest json")
  .action(async function(name, options) {
    const retCode = await remove(name, options);
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
