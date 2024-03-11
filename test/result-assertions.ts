import { Result } from "ts-results-es";

expect.extend({
  toBeOk<T>(result: Result<T, Error>, valueAsserter?: (value: T) => void) {
    if (!result.isOk())
      return {
        pass: false,
        message: () =>
          `Expected result to be ok, but had error: ${result.error},`,
      };

    if (valueAsserter !== undefined) valueAsserter(result.value);

    return { pass: true, message: () => "How did this happen?" };
  },

  toBeError<T extends Error>(
    result: Result<unknown, T>,
    errorAsserter?: (error: T) => void
  ) {
    if (result.isOk())
      return {
        pass: false,
        message: () =>
          `Expected result to be error, but had value: ${result.value},`,
      };

    if (errorAsserter !== undefined) errorAsserter(result.error);

    return { pass: true, message: () => "How did this happen?" };
  },
});
