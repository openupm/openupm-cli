import { AsyncResult, Err } from "ts-results-es";
import { CustomError } from "ts-custom-error";
import isWsl from "is-wsl";
import execute, { ChildProcessError } from "../utils/process";

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
  varName: string
): AsyncResult<string, WslPathError> {
  if (!isWsl) return Err(new NoWslError()).toAsyncResult();

  return execute(`wslpath "$(wslvar ${varName})"`, {
    trim: true,
  });
}
