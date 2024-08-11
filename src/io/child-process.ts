import childProcess from "child_process";
import { DebugLog, npmDebugLog } from "../logging";

/**
 * Function that run a child process.
 * @param command The command to run.
 * @returns The commands standard output.
 */
export type RunChildProcess = (command: string) => Promise<string>;

/**
 * Makes a {@link RunChildProcess} function which uses a promisified version of
 * the built-in {@link childProcess.exec} function.
 */
function ExecChildProcess(debugLog: DebugLog): RunChildProcess {
  return (command) =>
    new Promise(function (resolve, reject) {
      childProcess.exec(command, function (error, stdout) {
        if (error) {
          debugLog("A child process failed.", error);
          reject(error);
          return;
        }

        resolve(stdout);
      });
    });
}

/**
 * Default {@link RunChildProcess} function. Uses {@link ExecChildProcess}.
 */
export const runChildProcess = ExecChildProcess(npmDebugLog);
