import { AssertionError } from "assert";
import { HttpErrorBase } from "npm-registry-fetch/lib/errors";

export function isError(x: unknown): x is Error {
  return x !== null && typeof x === "object";
}
/**
 * @throws {AssertionError} The given parameter is not an error.
 */
export function assertIsError(x: unknown): asserts x is Error {
  if (!isError(x))
    throw new AssertionError({
      message: "Value is not an error.",
      actual: x,
      expected: {},
    });
}

export function isNodeError(x: unknown): x is NodeJS.ErrnoException {
  return isError(x) && "code" in x && "errno" in x;
}

/**
 * Asserts that a value is a Node.js error, i.e it includes properties
 * such as `code`.
 * @param x The value to check.
 * @throws {AssertionError} The given parameter is not a node-error.
 */
export function assertIsNodeError(
  x: unknown
): asserts x is NodeJS.ErrnoException {
  if (!isNodeError(x))
    throw new AssertionError({
      message: "Value is not a node error.",
      actual: x,
      expected: {
        code: "string",
        errno: "string",
      },
    });
}

export function isHttpError(x: unknown): x is HttpErrorBase {
  return isError(x) && "statusCode" in x;
}

export function assertIsHttpError(x: unknown): asserts x is HttpErrorBase {
  if (!isHttpError(x))
    throw new AssertionError({
      message: "Value is not an http error.",
      actual: x,
      expected: {
        statusCode: "number",
      },
    });
}
