import { AsyncResult, Err, Ok } from "ts-results-es";

/**
 * Creates an ok {@link AsyncResult} with a given value.
 * Shorthand for `Ok(value).toAsyncResult()`.
 * @param value The results value.
 */
export function AsyncOk<T>(value: T): AsyncResult<T, never>;
/**
 * Creates an empty ok {@link AsyncResult}.
 * Shorthand for `Ok(undefined).toAsyncResult()`.
 */
export function AsyncOk(): AsyncResult<void, never>;
export function AsyncOk(value?: unknown) {
  return Ok(value).toAsyncResult();
}

/**
 * Creates an error {@link AsyncResult} with a given error.
 * Shorthand for `Err(value).toAsyncResult()`.
 * @param error The results error.
 */
export function AsyncErr<T>(error: T): AsyncResult<never, T> {
  return Err(error).toAsyncResult();
}
