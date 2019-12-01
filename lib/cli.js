const program = require("commander");
const add = require("./cmd-add");
// const search = require("./cmd-search");
// const remove = require("./cmd-remove");

program
  .version("1.0.0")
  .option("-C, --chdir <path>", "change the working directory")
  .option("-R, --registry <url>", "specify registry url");

program
  .command("add <pkg>")
  .description(
    `add package to manifest json
openupm add <pkg>
openupm add <pkg>@<version>`
  )
  .action(function(pkg, options) {
    const [name, version] = pkg.split("@");
    add(name, version, options);
  });

// program
//   .command("search")
//   .command("s")
//   .description("Search package by name")
//   .action(function() {
//     search();
//   });

program.parse(process.argv);
