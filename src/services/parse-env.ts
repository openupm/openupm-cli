import chalk from "chalk";
import { GetUpmConfigPath, LoadUpmConfig } from "../io/upm-config-io";
import path from "path";
import { coerceRegistryUrl, RegistryUrl } from "../domain/registry-url";
import { tryGetAuthForRegistry, UPMConfig } from "../domain/upm-config";
import { CmdOptions } from "../cli/options";
import { tryGetEnv } from "../utils/env-util";
import { Registry } from "../domain/registry";
import { Logger } from "npmlog";
import { GetCwd } from "../io/special-paths";
import { CustomError } from "ts-custom-error";
import { DebugLog } from "../logging";
import { assertIsError } from "../utils/error-type-guards";

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
   * Whether the app is running in WSL.
   */
  wsl: boolean;
  /**
   * Whether to fall back to the upstream registry.
   */
  upstream: boolean;
  /**
   * The upstream registry.
   */
  upstreamRegistry: Registry;
  /**
   * The primary registry.
   */
  registry: Registry;
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
export function makeParseEnv(
  log: Logger,
  getUpmConfigPath: GetUpmConfigPath,
  loadUpmConfig: LoadUpmConfig,
  getCwd: GetCwd,
  debugLog: DebugLog
): ParseEnv {
  function determineCwd(options: CmdOptions): string {
    return options._global.chdir !== undefined
      ? path.resolve(options._global.chdir)
      : getCwd();
  }

  function determineWsl(options: CmdOptions): boolean {
    return options._global.wsl === true;
  }

  function determinePrimaryRegistry(
    options: CmdOptions,
    upmConfig: UPMConfig | null
  ): Registry {
    const url =
      options._global.registry !== undefined
        ? coerceRegistryUrl(options._global.registry)
        : RegistryUrl.parse("https://package.openupm.com");

    if (upmConfig === null) return { url, auth: null };

    const auth = tryGetAuthForRegistry(upmConfig, url);

    if (auth === null) {
      log.warn(
        "env.auth",
        `failed to parse auth info for ${url} in .upmconfig.toml: missing token or _auth fields`
      );
    }

    return { url, auth };
  }

  function determineUpstreamRegistry(): Registry {
    const url = RegistryUrl.parse("https://packages.unity.com");

    return { url, auth: null };
  }

  function determineLogLevel(options: CmdOptions): "verbose" | "notice" {
    return options._global.verbose ? "verbose" : "notice";
  }

  function determineUseColor(options: CmdOptions): boolean {
    return options._global.color !== false && tryGetEnv("NODE_ENV") !== "test";
  }

  function determineUseUpstream(options: CmdOptions): boolean {
    return options._global.upstream !== false;
  }

  function determineIsSystemUser(options: CmdOptions): boolean {
    return options._global.systemUser === true;
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
    const wsl = determineWsl(options);

    // registries
    const upmConfigPath = await getUpmConfigPath(wsl, systemUser);

    let registry: Registry;
    let upstreamRegistry: Registry;
    try {
      const upmConfig = await loadUpmConfig(upmConfigPath);
      registry = determinePrimaryRegistry(options, upmConfig);
      upstreamRegistry = determineUpstreamRegistry();
    } catch (error) {
      assertIsError(error);
      debugLog("Upmconfig load or parsing failed.", error);
      throw new RegistryAuthLoadError();
    }

    // cwd
    const cwd = determineCwd(options);

    return {
      cwd,
      registry,
      systemUser,
      upstream,
      upstreamRegistry,
      wsl,
    };
  };
}
