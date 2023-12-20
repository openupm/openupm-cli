import { HttpErrorBase } from "npm-registry-fetch";
import { AssertionError } from "assert";

export function assertIsError(x: unknown): asserts x is Error {
  if (!(x instanceof Error))
    throw new AssertionError({
      message: "Argument was not an error!",
      actual: x,
    });
}

export const isHttpError = (x: unknown): x is HttpErrorBase => {
  return x instanceof Error && "statusCode" in x;
};

export const isConnectionError = (err: HttpErrorBase): boolean =>
  err.code === "ENOTFOUND";

export const is404Error = (err: HttpErrorBase): boolean =>
  err.statusCode === 404 || err.message.includes("404");

export const is503Error = (err: HttpErrorBase): boolean =>
  err.statusCode === 503;
