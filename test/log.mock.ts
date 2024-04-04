import log from "../src/cli/logger";
import { Logger, LogLevels } from "npmlog";

type LogSpy = jest.SpyInstance<void, Parameters<Logger[LogLevels]>>;

expect.extend({
  toHaveLogLike(spy: LogSpy, prefix: string, message: string) {
    const calls = spy.mock.calls;
    const callsWithPrefix = calls.filter(
      ([actualPrefix]) => actualPrefix === prefix
    );
    const hasMatch = callsWithPrefix.some(([, actualMessage]) =>
      actualMessage.includes(message)
    );
    return {
      pass: hasMatch,
      message: () =>
        callsWithPrefix.length === 0
          ? `No log had the prefix "${prefix}"`
          : `At least one log had the correct prefix but no message included "${message}"`,
    };
  },
});

/**
 * Creates a spy for mocking logs to a specific logging-level.
 * @param level The level to spy on.
 */
export function spyOnLog(level: LogLevels): LogSpy {
  return jest.spyOn(log, level);
}
