import path from "path";
import childProcess from "child_process";
import fse from "fs-extra";
import os from "os";

export type AppOutput = {
  stdOut: string[];
  stdErr: string[];
  code: number;
};

const projectDir = path.join(os.homedir(), "projects/MyUnityProject");

/**
 * Runs openupm. It assumes that it was previously built to the default location.
 * @param args Strings containing commands, arguments and options.
 * @returns The runs status-code.
 */
export async function runOpenupm(args: string[]): Promise<AppOutput> {
  await fse.ensureDir(projectDir);

  const entryPointPath = path.resolve("./lib/index.js");
  const openupmProcess = childProcess.fork(entryPointPath, args, {
    stdio: "pipe",
    cwd: projectDir,
  });

  const stdOut = Array.of<string>();
  const stdErr = Array.of<string>();

  openupmProcess.stdout!.on("data", (data) => stdOut.push(data.toString()));
  openupmProcess.stderr!.on("data", (data) => stdErr.push(data.toString()));

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
