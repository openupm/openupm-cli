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

export const eaccesError = makeNodeError("EACCES");

export const enoentError = makeNodeError("ENOENT");
