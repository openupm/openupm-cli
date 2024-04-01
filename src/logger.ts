import npmlog from "npmlog";
import { tryGetEnv } from "./utils/env-util";

if (tryGetEnv("NODE_ENV") === "test") {
  npmlog.stream = process.stdout;
  npmlog.disableColor();
}

export default npmlog;
