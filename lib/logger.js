const log = require("loglevel");
const prefix = require("./loglevel-plugin-prefix");

prefix.reg(log);
if (process.env.NODE_ENV == "test") {
  prefix.apply(log, {
    // eslint-disable-next-line no-unused-vars
    format(level, name, timestamp) {
      return "[test]";
    }
  });
} else {
  prefix.apply(log, {
    // eslint-disable-next-line no-unused-vars
    format(level, name, timestamp) {
      if (level == "ERROR" || level == "WARN") {
        return `[${level}]`;
      }
      return "";
    }
  });
}

module.exports = log;
