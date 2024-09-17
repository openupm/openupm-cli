import chalk from "chalk";
import { Logger } from "npmlog";
import path from "path";
import { CustomError } from "ts-custom-error";
import { CmdOptions } from "./options";

/**
 * Error for when auth information for a registry could not be loaded.
 */
export class RegistryAuthLoadError extends CustomError {
  // noinspection JSUnusedLocalSymbols
}

/**
 * Contains information about the environment and context a command is run in.
 */
export type Env = Readonly<{
  /**
   * The working directory.
   */
  cwd: string;
  /**
   * Whether the user is a system-user.
   */
  systemUser: boolean;
  /**
   * Whether to fall back to the Unity registry.
   */
  upstream: boolean;
}>;

/**
 * Determines the directory in which to execute commands.
 * @param processCwd The process cwd.
 * @param options Cmd options.
 */
export function determineCwd(processCwd: string, options: CmdOptions): string {
  return options.chdir !== undefined ? path.resolve(options.chdir) : processCwd;
}

/**
 * Determines which log level to use for output.
 * @param options Cmd options.
 */
export function determineLogLevel(options: CmdOptions): "verbose" | "notice" {
  return options.verbose ? "verbose" : "notice";
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
 * Determines whether to use the upstream registry.
 * @param options Cmd options.
 */
export function determineUseUpstream(options: CmdOptions): boolean {
  return options.upstream !== false;
}

/**
 * Determines whether to authenticate as the system-user.
 * @param options Cmd options.
 */
export function determineIsSystemUser(options: CmdOptions): boolean {
  return options.systemUser === true;
}

/**
 * Function for parsing environment information and global
 * command-options for further usage.
 * @param log The logger that is used in the application.
 * @param envVars Environment variables.
 * @param processCwd The process directory.
 * @param options The options passed to the current command.
 * @returns Environment information.
 */
export async function parseEnvUsing(
  log: Logger,
  envVars: Record<string, string | undefined>,
  processCwd: string,
  options: CmdOptions
): Promise<Env> {
  // log level
  log.level = determineLogLevel(options);

  // color
  const useColor = determineUseColor(envVars, options);
  if (!useColor) {
    chalk.level = 0;
    log.disableColor();
  }

  // upstream
  const upstream = determineUseUpstream(options);

  // auth
  const systemUser = determineIsSystemUser(options);

  // cwd
  const cwd = determineCwd(processCwd, options);

  return {
    cwd,
    systemUser,
    upstream,
  };
}
