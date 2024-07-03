import childProcess from "child_process";
import { CustomError } from "ts-custom-error";
import { DebugLog } from "../logging";

/**
 * Error that might occur when running a child process.
 */
export class ChildProcessError extends CustomError {
  private readonly _class = "ChildProcessError";
  constructor() {
    super();
  }
}

/**
 * Function that run a child process.
 * @param command The command to run.
 * @returns The commands standard output.
 */
export type RunChildProcess = (command: string) => Promise<string>;

/**
 * Makes a {@link RunChildProcess} function.
 */
export function makeRunChildProcess(debugLog: DebugLog): RunChildProcess {
  return (command) =>
    new Promise(function (resolve, reject) {
      childProcess.exec(command, function (error, stdout, stderr) {
        if (error) {
          debugLog("A child process failed.", error);
          reject(new ChildProcessError());
          return;
        }
        if (stderr) {
          debugLog(`A child process failed with the output: ${stderr}`);
          reject(new ChildProcessError());
          return;
        }
        resolve(stdout);
      });
    });
}
