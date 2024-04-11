import childProcess from "child_process";
import { AsyncResult, Err, Ok } from "ts-results-es";
import { CustomError } from "ts-custom-error";

/**
 * Error that might occur when running a child process.
 */
export class ChildProcessError extends CustomError {
  private readonly _class = "ChildProcessError";
  constructor(
    /**
     * The internal error that caused this error.
     */
    readonly cause: childProcess.ExecException | NodeJS.ErrnoException
  ) {
    super();
  }
}

/**
 * @param command A shell command to execute.
 * @param trim Whether to trim whitespace from command output.
 * @returns Result with either stdout string or an error.
 */
export default function execute(
  command: string,
  { trim }: { trim: boolean }
): AsyncResult<string, ChildProcessError> {
  return new AsyncResult(
    new Promise(function (resolve) {
      childProcess.exec(command, function (error, stdout, stderr) {
        if (error) {
          resolve(Err(new ChildProcessError(error)));
          return;
        }
        if (stderr) {
          resolve(Err(new ChildProcessError(new Error(stderr))));
          return;
        }
        resolve(Ok(trim ? stdout.trim() : stdout));
      });
    })
  );
}
