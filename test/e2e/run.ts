import path from "path";
import childProcess from "child_process";

export type AppOutput = {
  stdOut: string[];
  stdErr: string[];
  code: number;
};

/**
 * Runs openupm. It assumes that it was previously built to the default location.
 * @param cwd The directory in which to run openupm.
 * @param args Strings containing commands, arguments and options.
 * @returns The runs status-code.
 */
export async function runOpenupm(
  cwd: string,
  args: string[]
): Promise<AppOutput> {
  const entryPointPath = path.resolve("./lib/index.js");
  const openupmProcess = childProcess.fork(entryPointPath, args, {
    stdio: "pipe",
    cwd,
  });

  const stdOut = Array.of<string>();
  const stdErr = Array.of<string>();

  openupmProcess.stdout!.on("data", (data) => {
    const line = data.toString();
    console.log(line);
    return stdOut.push(line);
  });
  openupmProcess.stderr!.on("data", (data) => {
    const line = data.toString();
    console.log(line);
    return stdErr.push(line);
  });

  return await new Promise<AppOutput>((resolve) =>
    openupmProcess.on("exit", (code) =>
      resolve({
        stdOut,
        stdErr,
        code: code!,
      })
    )
  );
}
