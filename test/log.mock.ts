import log from "../src/cli/logger";
import { Logger, LogLevels } from "npmlog";

type LogSpy = jest.SpyInstance<void, Parameters<Logger[LogLevels]>>;

expect.extend({
  toHaveLogLike(
    spy: LogSpy,
    prefix: string,
    message: string,
    count: number = 1
  ) {
    const calls = spy.mock.calls;
    const callsWithPrefix = calls.filter(
      ([actualPrefix]) => actualPrefix === prefix
    );
    const matchingCalls = callsWithPrefix.filter(([, actualMessage]) =>
      actualMessage.includes(message)
    );
    const hasMatch = matchingCalls.length >= count;
    return {
      pass: hasMatch,
      message: () => `Logs failed expectation
      Criteria:
        Prefix: "${prefix}"
        Message: "${message}"
        Min-count: ${count}
      Issue: ${
        callsWithPrefix.length === 0
          ? "No logs had the correct prefix"
          : matchingCalls.length === 0
          ? "At least one log had the correct prefix, but none had a matching message"
          : `There were logs matching the criteria, but not enough (${matchingCalls.length})`
      }`,
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
