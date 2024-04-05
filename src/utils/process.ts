import childProcess from "child_process";
import { AsyncResult, Err, Ok } from "ts-results-es";

/**
 * Error that might occur when running a child process.
 */
export type ChildProcessError = childProcess.ExecException;

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
          resolve(Err(error));
          return;
        }
        if (stderr) {
          resolve(Err(new Error(stderr)));
          return;
        }
        resolve(Ok(trim ? stdout.trim() : stdout));
      });
    })
  );
}
