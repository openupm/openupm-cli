const log = require("loglevel");
const prefix = require("loglevel-plugin-prefix");

prefix.reg(log);
prefix.apply(log, {
  // eslint-disable-next-line no-unused-vars
  format(level, name, timestamp) {
    return process.env.NODE_ENV == "test" ? "[test]" : "";
  }
});

module.exports = log;
