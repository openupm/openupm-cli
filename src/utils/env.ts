import log from "../logger";
import chalk from "chalk";
import {
  GetUpmConfigDirError,
  tryGetUpmConfigDir,
  tryLoadUpmConfig,
} from "./upm-config-io";
import path from "path";
import fs from "fs";
import { coerceRegistryUrl, makeRegistryUrl } from "../types/registry-url";
import { tryGetAuthForRegistry, UPMConfig } from "../types/upm-config";
import { CmdOptions } from "../types/options";
import { Registry } from "../npm-client";
import { FileParseError } from "../common-errors";
import { Err, Ok, Result } from "ts-results-es";
import {
  ProjectVersionLoadError,
  tryLoadProjectVersion,
} from "./project-version-io";
import { NotFoundError } from "./file-io";

export type Env = Readonly<{
  cwd: string;
  systemUser: boolean;
  wsl: boolean;
  upstream: boolean;
  upstreamRegistry: Registry;
  registry: Registry;
  editorVersion: string | null;
}>;

export type EnvParseError =
  | NotFoundError
  | GetUpmConfigDirError
  | ProjectVersionLoadError;

function determineCwd(options: CmdOptions): Result<string, NotFoundError> {
  const cwd =
    options._global.chdir !== undefined
      ? path.resolve(options._global.chdir)
      : process.cwd();

  if (!fs.existsSync(cwd)) return Err(new NotFoundError(cwd));

  return Ok(cwd);
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
      : options._global.cn === true
      ? makeRegistryUrl("https://package.openupm.cn")
      : makeRegistryUrl("https://package.openupm.com");

  const auth =
    upmConfig !== null ? tryGetAuthForRegistry(upmConfig, url) : null;

  return { url, auth };
}

function determineUpstreamRegistry(
  options: CmdOptions,
  upmConfig: UPMConfig | null
): Registry {
  const url =
    options._global.cn === true
      ? makeRegistryUrl("https://packages.unity.cn")
      : makeRegistryUrl("https://packages.unity.com");

  const auth =
    upmConfig !== null ? tryGetAuthForRegistry(upmConfig, url) : null;

  return { url, auth };
}

function determineLogLevel(options: CmdOptions): "verbose" | "notice" {
  return options._global.verbose ? "verbose" : "notice";
}

function determineUseColor(options: CmdOptions): boolean {
  return options._global.color !== false && process.env.NODE_ENV !== "test";
}

function determineUseUpstream(options: CmdOptions): boolean {
  return options._global.upstream !== false;
}

function determineIsSystemUser(options: CmdOptions): boolean {
  return options._global.systemUser === true;
}

/**
 * Attempts to parse env.
 */
export const parseEnv = async function (
  options: CmdOptions
): Promise<Result<Env, EnvParseError>> {
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

  // region cn
  if (options._global.cn === true) log.notice("region", "cn");

  // auth
  const systemUser = determineIsSystemUser(options);
  const wsl = determineWsl(options);

  // registries
  const upmConfigResult = await tryGetUpmConfigDir(wsl, systemUser).map(
    tryLoadUpmConfig
  ).promise;
  if (upmConfigResult.isErr()) return upmConfigResult;
  const upmConfig = upmConfigResult.value;

  const registry = determinePrimaryRegistry(options, upmConfig);
  const upstreamRegistry = determineUpstreamRegistry(options, upmConfig);

  // cwd
  const cwdResult = determineCwd(options);
  if (cwdResult.isErr()) {
    log.error("env", `can not resolve path ${cwdResult.error.path}`);
    return cwdResult;
  }
  const cwd = cwdResult.value;

  // editor version
  const projectVersionLoadResult = await tryLoadProjectVersion(cwd);
  if (projectVersionLoadResult.isErr()) {
    if (projectVersionLoadResult.error instanceof NotFoundError)
      log.warn(
        "ProjectVersion",
        `can not locate ProjectVersion.text at path ${projectVersionLoadResult.error.path}`
      );
    else if (projectVersionLoadResult.error instanceof FileParseError)
      log.error(
        "ProjectVersion",
        "ProjectVersion.txt could not be parsed for editor-version!"
      );
    return projectVersionLoadResult;
  }
  const editorVersion = projectVersionLoadResult.value;

  return Ok({
    cwd,
    editorVersion,
    registry,
    systemUser,
    upstream,
    upstreamRegistry,
    wsl,
  });
};
