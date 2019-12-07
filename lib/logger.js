const log = require("loglevel");
const prefix = require("loglevel-plugin-prefix");

if (process.env.NODE_ENV == "test") {
  prefix.reg(log);
  prefix.apply(log, {
    // eslint-disable-next-line no-unused-vars
    format(level, name, timestamp) {
      return "[test]";
    }
  });
}

module.exports = log;
