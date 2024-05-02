import os from "os";
import path from "path";
import childProcess from "child_process";

const testDirBasePath = path.resolve(os.tmpdir(), "openupm-cli");

/**
 * Makes a temporary directory path for a test.
 * @param testName A short string identifying the test or test-suite.
 * @returns The path.
 */
export function makeTestDirPath(testName: string): string {
  return path.join(testDirBasePath, testName);
}

export type AppOutput = {
  stdOut: string[];
  stdErr: string[];
  code: number;
};

/**
 * Runs Openupm.
 * @param args Strings containing commands, arguments and options.
 * @returns The runs status-code.
 */
export function runOpenupm(args: string[]): Promise<AppOutput> {
  const openupmProcess = childProcess.fork("./lib/index.js", args, {
    stdio: "pipe",
  });

  const stdOut = Array.of<string>();
  const stdErr = Array.of<string>();

  openupmProcess.stdout!.on("data", (data) => stdOut.push(data.toString()));
  openupmProcess.stderr!.on("data", (data) => stdErr.push(data.toString()));

  return new Promise<AppOutput>((resolve) =>
    openupmProcess.on("exit", (code) =>
      resolve({
        stdOut,
        stdErr,
        code: code!,
      })
    )
  );
}
