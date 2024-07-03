import chalk from "chalk";
import {
  GetUpmConfigPath,
  LoadUpmConfig,
  UpmConfigLoadError,
} from "../io/upm-config-io";
import path from "path";
import { coerceRegistryUrl, makeRegistryUrl } from "../domain/registry-url";
import { tryGetAuthForRegistry, UPMConfig } from "../domain/upm-config";
import { CmdOptions } from "../cli/options";
import { Ok, Result } from "ts-results-es";
import { tryGetEnv } from "../utils/env-util";
import { Registry } from "../domain/registry";
import { Logger } from "npmlog";
import { GetCwd } from "../io/special-paths";

export type Env = Readonly<{
  cwd: string;
  systemUser: boolean;
  wsl: boolean;
  upstream: boolean;
  upstreamRegistry: Registry;
  registry: Registry;
}>;

export type EnvParseError = UpmConfigLoadError;

/**
 * Function for parsing environment information and global
 * command-options for further usage.
 */
export type ParseEnv = (
  options: CmdOptions
) => Promise<Result<Env, EnvParseError>>;

/**
 * Creates a {@link ParseEnv} function.
 */
export function makeParseEnv(
  log: Logger,
  getUpmConfigPath: GetUpmConfigPath,
  loadUpmConfig: LoadUpmConfig,
  getCwd: GetCwd
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
        : makeRegistryUrl("https://package.openupm.com");

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

  function determineUpstreamRegistry(options: CmdOptions): Registry {
    const url = makeRegistryUrl("https://packages.unity.com");

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
    const upmConfigResult = await loadUpmConfig(upmConfigPath).promise;
    if (upmConfigResult.isErr()) return upmConfigResult;
    const upmConfig = upmConfigResult.value;

    const registry = determinePrimaryRegistry(options, upmConfig);
    const upstreamRegistry = determineUpstreamRegistry(options);

    // cwd
    const cwd = determineCwd(options);

    return Ok({
      cwd,
      registry,
      systemUser,
      upstream,
      upstreamRegistry,
      wsl,
    });
  };
}
