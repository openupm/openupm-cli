import log from "../src/logger";
import { Logger, LogLevels } from "npmlog";

type LogSpy = jest.SpyInstance<void, Parameters<Logger[LogLevels]>>;

/**
 * Creates a spy for mocking logs to a specific logging-level.
 * @param level The level to spy on.
 */
export function spyOnLog(level: LogLevels): LogSpy {
  return jest.spyOn(log, level);
}
