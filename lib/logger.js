const npmlog = require("npmlog");

if (process.env.NODE_ENV == "test") {
  npmlog.stream = process.stdout;
  npmlog.disableColor();
}

module.exports = { log: npmlog };
