/**
 * Makes a NodeJS error for testing.
 * @param code The errors error code.
 */
export function makeNodeError(code: string): NodeJS.ErrnoException {
  const error = new Error() as NodeJS.ErrnoException;
  error.errno = 123;
  error.code = code;
  return error;
}

/**
 * A premade EACCES node error.
 */
export const eaccesError = makeNodeError("EACCES");

/**
 * A premade ENOENT node error.
 */
export const enoentError = makeNodeError("ENOENT");
