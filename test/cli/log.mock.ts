import { Logger, LogLevels } from "npmlog";
import AsymmetricMatcher = jest.AsymmetricMatcher;

type LogSpy = jest.MockedFunctionDeep<Logger[LogLevels]>;

expect.extend({
  toHaveLogLike(
    spy: LogSpy,
    prefix: string,
    expected: string | AsymmetricMatcher,
    count: number = 1
  ) {
    const matches = (s: string) =>
      typeof expected === "string"
        ? s === expected
        : expected.asymmetricMatch(s);

    const calls = spy.mock.calls;
    const callsWithPrefix = calls.filter(
      ([actualPrefix]) => actualPrefix === prefix
    );
    const matchingCalls = callsWithPrefix.filter(([, actualMessage]) =>
      matches(actualMessage)
    );
    const hasMatch = matchingCalls.length >= count;
    return {
      pass: hasMatch,
      message: () => `Logs failed expectation
      Criteria:
        Prefix: "${prefix}"
        Message: "${expected}"
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
 * Creates mock logger.
 */
export function makeMockLogger() {
  return jest.mocked(jest.createMockFromModule<Logger>("npmlog"));
}
