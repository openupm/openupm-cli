import { AssertionError } from "assert";
import { HttpErrorLike } from "../io/common-errors.js";

/**
 * Type guard for checking if a value is an {@link Error}.
 *
 * Note: This function is somewhat "duck-type-y". It only makes sure that the
 * value is a non-null object. It does not truly establish that it is an
 * instance of the {@link Error} class.
 * @param x The value.
 */
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

/**
 * Type guard for checking whether a value is a Node.js Error.
 * @param x The value to check.
 */
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

/**
 * Type guard for checking whether a value is a {@link HttpErrorLike}.
 * @param x The value to check.
 */
export function isHttpError(x: unknown): x is HttpErrorLike {
  return isError(x) && "statusCode" in x;
}

/**
 * Asserts that a value is a {@link HttpErrorLike}.
 * @param x The value to assert.
 * @throws {AssertionError} If the value is not a {@link HttpErrorLike}.
 */
export function assertIsHttpError(x: unknown): asserts x is HttpErrorLike {
  if (!isHttpError(x))
    throw new AssertionError({
      message: "Value is not an http error.",
      actual: x,
      expected: {
        statusCode: "number",
      },
    });
}
