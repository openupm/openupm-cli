import childProcess from "child_process";
import { DebugLog } from "../logging";

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
          reject(error);
          return;
        }

        resolve(stdout);
      });
    });
}
