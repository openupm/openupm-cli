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

const dummyLogger = {
  trace: function() {},
  debug: function() {},
  info: function() {},
  log: function() {},
  warn: function() {},
  warning: function() {},
  err: function() {},
  error: function() {},
  fatal: function() {},
  verbose: function() {},
  http: function() {}
};

module.exports = { log, dummyLogger };
