import { AsyncResult, Err, Ok } from "ts-results-es";

/**
 * Creates an {@link AsyncResult} with a given value.
 * Shorthand for `Ok(value).toAsyncResult()`.
 * @param value The results value.
 */
export function AsyncOk<T>(value: T): AsyncResult<T, never> {
  return Ok(value).toAsyncResult();
}

/**
 * Creates an {@link AsyncResult} with a given error.
 * Shorthand for `Err(value).toAsyncResult()`.
 * @param error The results error.
 */
export function AsyncErr<T>(error: T): AsyncResult<never, T> {
  return Err(error).toAsyncResult();
}
