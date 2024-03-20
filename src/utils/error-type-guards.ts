import { HttpErrorBase } from "npm-registry-fetch";
import assert, { AssertionError } from "assert";

/**
 * @throws {AssertionError} The given parameter is not an error.
 */
export function assertIsError(x: unknown): asserts x is Error {
  assert(x !== null);
  assert(typeof x === "object");
  assert("name" in x);
  assert("message" in x);
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
  assertIsError(x);
  assert("code" in x);
}

export function assertIsHttpError(x: unknown): asserts x is HttpErrorBase {
  assertIsError(x);
  if (!("statusCode" in x))
    throw new AssertionError({ message: "Argument was not an HTTP-error." });
}

export const isHttpError = (x: unknown): x is HttpErrorBase => {
  return x instanceof Error && "statusCode" in x;
};

export const is404Error = (err: HttpErrorBase): boolean =>
  err.statusCode === 404 || err.message.includes("404");
