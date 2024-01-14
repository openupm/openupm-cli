import childProcess from "child_process";

/**
 * @param command A shell command to execute
 * @return A promise that resolve to the output of the shell command, or an error
 * @example const output = await execute("ls -alh");
 */
export default function execute(
  command: string,
  { trim }: { trim: boolean }
): Promise<string> {
  /**
   * @param {Function} resolve A function that resolves the promise
   * @param {Function} reject A function that fails the promise
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
   */
  return new Promise(function (resolve, reject) {
    /**
     * @param {Error} error An error triggered during the execution of the "childProcess.exec" command
     * @param {string|Buffer} stdout The result of the shell command execution
     * @param {string|Buffer} stderr The error resulting of the shell command execution
     * @see https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback
     */
    childProcess.exec(command, function (error, stdout, stderr) {
      if (error) {
        reject();
        return;
      }
      if (stderr) {
        reject(stderr);
        return;
      }
      resolve(trim ? stdout.trim() : stdout);
    });
  });
}
