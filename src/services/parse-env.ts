import chalk from "chalk";
import { Logger } from "npmlog";
import path from "path";
import { CustomError } from "ts-custom-error";
import { CmdOptions } from "../cli/options";
import {
  coerceRegistryUrl,
  openupmRegistryUrl,
  RegistryUrl,
} from "../domain/registry-url";
import { GetCwd } from "../io/special-paths";
import { tryGetEnv } from "../utils/env-util";

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
  /**
   * The primary registry url.
   */
  primaryRegistryUrl: RegistryUrl;
}>;

/**
 * Function for parsing environment information and global
 * command-options for further usage.
 * @param options The options passed to the current command.
 * @returns Environment information.
 */
export type ParseEnv = (options: CmdOptions) => Promise<Env>;

/**
 * Creates a {@link ParseEnv} function.
 */
export function makeParseEnv(log: Logger, getCwd: GetCwd): ParseEnv {
  function determineCwd(options: CmdOptions): string {
    return options.chdir !== undefined ? path.resolve(options.chdir) : getCwd();
  }

  function determineLogLevel(options: CmdOptions): "verbose" | "notice" {
    return options.verbose ? "verbose" : "notice";
  }

  function determineUseColor(options: CmdOptions): boolean {
    return options.color !== false && tryGetEnv("NODE_ENV") !== "test";
  }

  function determineUseUpstream(options: CmdOptions): boolean {
    return options.upstream !== false;
  }

  function determineIsSystemUser(options: CmdOptions): boolean {
    return options.systemUser === true;
  }

  function determinePrimaryRegistryUrl(options: CmdOptions): RegistryUrl {
    if (options.registry === undefined) return openupmRegistryUrl;
    return coerceRegistryUrl(options.registry);
  }

  return async (options) => {
    // log level
    log.level = determineLogLevel(options);

    // color
    const useColor = determineUseColor(options);
    if (!useColor) {
      chalk.level = 0;
      log.disableColor();
    }

    // upstream
    const upstream = determineUseUpstream(options);

    // auth
    const systemUser = determineIsSystemUser(options);

    // registries
    const primaryRegistryUrl = determinePrimaryRegistryUrl(options);

    // cwd
    const cwd = determineCwd(options);

    return {
      cwd,
      primaryRegistryUrl,
      systemUser,
      upstream,
    };
  };
}
