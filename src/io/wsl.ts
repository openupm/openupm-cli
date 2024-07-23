import { CustomError } from "ts-custom-error";
import isWsl from "is-wsl";
import { RunChildProcess } from "./child-process";

/**
 * Error for when attempting to interact with wsl on a non-wsl system.
 */
export class NoWslError extends CustomError {
  constructor() {
    super();
  }
}

/**
 * Attempt to resolve the wls path for a variable.
 * @param varName The variable name.
 */
export function tryGetWslPath(
  varName: string,
  runChildProcess: RunChildProcess
): Promise<string> {
  // TODO: Convert to service function.
  if (!isWsl) throw new NoWslError();

  return runChildProcess(`wslpath "$(wslvar ${varName})"`).then((output) =>
    output.trim()
  );
}
