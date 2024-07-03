import { CustomError } from "ts-custom-error";
import isWsl from "is-wsl";
import { ChildProcessError, RunChildProcess } from "./child-process";

/**
 * Error for when attempting to interact with wsl on a non-wsl system.
 */
export class NoWslError extends CustomError {
  private readonly _class = "NoWslError";
  constructor() {
    super("No WSL detected.");
  }
}

/**
 * Error which may occur when resolving a wsl path.
 */
export type WslPathError = NoWslError | ChildProcessError;

/**
 * Attempt to resolve the wls path for a variable.
 * @param varName The variable name.
 */
export function tryGetWslPath(
  varName: string,
  runChildProcess: RunChildProcess
): Promise<string> {
  if (!isWsl) throw new NoWslError();

  return runChildProcess(`wslpath "$(wslvar ${varName})"`).then((output) =>
    output.trim()
  );
}
