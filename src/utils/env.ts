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
import { tryGetAuthForRegistry } from "../types/upm-config";
import { CmdOptions } from "../types/options";
import { Registry } from "../npm-client";
import { CustomError } from "ts-custom-error";
import { FileParseError, RequiredFileNotFoundError } from "../common-errors";
import { Err, Ok, Result } from "ts-results-es";
import {
  ProjectVersionLoadError,
  tryLoadProjectVersion,
} from "./project-version-io";
import { manifestPathFor } from "./project-manifest-io";

export type Env = Readonly<{
  cwd: string;
  systemUser: boolean;
  wsl: boolean;
  upstream: boolean;
  upstreamRegistry: Registry;
  registry: Registry;
  editorVersion: string | null;
}>;

export class CwdNotFoundError extends CustomError {
  constructor(
    /**
     * The path that was not found.
     */
    readonly path: string
  ) {
    super();
  }
}

export type EnvParseError =
  | CwdNotFoundError
  | GetUpmConfigDirError
  | ProjectVersionLoadError;

function determineCwd(options: CmdOptions): Result<string, CwdNotFoundError> {
  const cwd =
    options._global.chdir !== undefined
      ? path.resolve(options._global.chdir)
      : process.cwd();

  if (!fs.existsSync(cwd)) return Err(new CwdNotFoundError(cwd));

  return Ok(cwd);
}

function determineWsl(options: CmdOptions): boolean {
  return options._global.wsl === true;
}

/**
 * Attempts to parse env.
 */
export const parseEnv = async function (
  options: CmdOptions,
  checkPath: boolean
): Promise<Result<Env, EnvParseError>> {
  // set defaults
  let registry: Registry = {
    url: makeRegistryUrl("https://package.openupm.com"),
    auth: null,
  };
  let upstream = true;
  let upstreamRegistry: Registry = {
    url: makeRegistryUrl("https://packages.unity.com"),
    auth: null,
  };
  let systemUser = false;
  let wsl = false;
  let editorVersion: string | null = null;
  // log level
  log.level = options._global.verbose ? "verbose" : "notice";
  // color
  const useColor =
    options._global.color !== false && process.env.NODE_ENV !== "test";
  if (!useColor) {
    chalk.level = 0;
    log.disableColor();
  }
  // upstream
  if (options._global.upstream === false) upstream = false;
  // region cn
  if (options._global.cn === true) {
    registry = {
      url: makeRegistryUrl("https://package.openupm.cn"),
      auth: null,
    };
    upstreamRegistry = {
      url: makeRegistryUrl("https://packages.unity.cn"),
      auth: null,
    };
    log.notice("region", "cn");
  }
  // registry
  if (options._global.registry) {
    registry = {
      url: coerceRegistryUrl(options._global.registry),
      auth: null,
    };
  }

  // auth
  if (options._global.systemUser) systemUser = true;
  wsl = determineWsl(options);

  const upmConfigResult = await tryGetUpmConfigDir(wsl, systemUser).map(
    tryLoadUpmConfig
  ).promise;
  if (upmConfigResult.isErr()) return upmConfigResult;
  const upmConfig = upmConfigResult.value;

  if (upmConfig !== null && upmConfig.npmAuth !== undefined) {
    registry = {
      url: registry.url,
      auth: tryGetAuthForRegistry(upmConfig, registry.url),
    };
    upstreamRegistry = {
      url: upstreamRegistry.url,
      auth: tryGetAuthForRegistry(upmConfig, upstreamRegistry.url),
    };
  }
  // return if no need to check path
  if (!checkPath)
    return Ok({
      cwd: "",
      editorVersion,
      registry,
      systemUser,
      upstream,
      upstreamRegistry,
      wsl,
    });

  // cwd
  const cwdResult = determineCwd(options);
  if (cwdResult.isErr()) {
    log.error("env", `can not resolve path ${cwdResult.error.path}`);
    return cwdResult;
  }
  const cwd = cwdResult.value;

  // manifest path
  const manifestPath = manifestPathFor(cwd);
  if (!fs.existsSync(manifestPath)) {
    log.error(
      "manifest",
      `can not locate manifest.json at path ${manifestPath}`
    );
    return Err(new RequiredFileNotFoundError(manifestPath));
  }

  // editor version
  const projectVersionLoadResult = await tryLoadProjectVersion(cwd);
  if (projectVersionLoadResult.isErr()) {
    if (projectVersionLoadResult.error instanceof RequiredFileNotFoundError)
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
  editorVersion = projectVersionLoadResult.value;

  // return
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
