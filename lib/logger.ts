import npmlog from "npmlog";

if (process.env.NODE_ENV == "test") {
  npmlog.stream = process.stdout;
  npmlog.disableColor();
}

export default npmlog;
