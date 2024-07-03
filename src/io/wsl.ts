import { AsyncResult, Err, Result } from "ts-results-es";
import { CustomError } from "ts-custom-error";
import isWsl from "is-wsl";
import { ChildProcessError, RunChildProcess } from "./child-process";
import assert from "assert";

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
): AsyncResult<string, WslPathError> {
  if (!isWsl) return Err(new NoWslError()).toAsyncResult();

  return new AsyncResult(
    Result.wrapAsync(() => runChildProcess(`wslpath "$(wslvar ${varName})"`))
  )
    .map((output) => output.trim())
    .mapErr((error) => {
      assert(error instanceof ChildProcessError);
      return error;
    });
}
