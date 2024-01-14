import { HttpErrorBase } from "npm-registry-fetch";
import { AssertionError } from "assert";

/*
 * Note: We are in a Node context, where Errors have the "code" property.
 * We need to make sure we use Node's error type instead of the default one
 * @see https://dev.to/jdbar/the-problem-with-handling-node-js-errors-in-typescript-and-the-workaround-m64
 */
import ErrnoException = NodeJS.ErrnoException;

/**
 * @throws AssertionError The given parameter is not an error.
 */
export function assertIsError(x: unknown): asserts x is ErrnoException {
  if (!(x instanceof Error))
    throw new AssertionError({
      message: "Argument was not an error!",
      actual: x,
    });
}

export const isHttpError = (x: unknown): x is HttpErrorBase => {
  return x instanceof Error && "statusCode" in x;
};

export const is404Error = (err: HttpErrorBase): boolean =>
  err.statusCode === 404 || err.message.includes("404");
