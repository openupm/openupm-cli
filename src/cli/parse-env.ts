import chalk from "chalk";
import { Logger } from "npmlog";
import { CustomError } from "ts-custom-error";
import { CmdOptions } from "./options";

/**
 * Error for when auth information for a registry could not be loaded.
 */
export class RegistryAuthLoadError extends CustomError {
  // noinspection JSUnusedLocalSymbols
}

/**
 * Determines whether to use color for output.
 * @param envVars Environment variables.
 * @param options Cmd options.
 */
export function determineUseColor(
  envVars: Record<string, string | undefined>,
  options: CmdOptions
): boolean {
  return options.color !== false && envVars["NODE_ENV"] !== "test";
}

/**
 * Function for parsing environment information and global
 * command-options for further usage.
 * @param log The logger that is used in the application.
 * @param envVars Environment variables.
 * @param options The options passed to the current command.
 * @returns Environment information.
 */
export async function parseEnvUsing(
  log: Logger,
  envVars: Record<string, string | undefined>,
  options: CmdOptions
): Promise<void> {
  // color
  const useColor = determineUseColor(envVars, options);
  if (!useColor) {
    chalk.level = 0;
    log.disableColor();
  }
}
