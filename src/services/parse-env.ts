import chalk from "chalk";
import {
  GetUpmConfigDir,
  GetUpmConfigDirError,
  LoadUpmConfig,
  UpmConfigLoadError,
} from "../io/upm-config-io";
import path from "path";
import { coerceRegistryUrl, makeRegistryUrl } from "../domain/registry-url";
import { tryGetAuthForRegistry, UPMConfig } from "../domain/upm-config";
import { CmdOptions } from "../cli/options";
import { FileParseError } from "../common-errors";
import { Ok, Result } from "ts-results-es";
import {
  LoadProjectVersion,
  ProjectVersionLoadError,
} from "../io/project-version-io";
import { NotFoundError } from "../io/file-io";
import { tryGetEnv } from "../utils/env-util";
import {
  isRelease,
  ReleaseVersion,
  tryParseEditorVersion,
} from "../domain/editor-version";
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
  /**
   * The current project's editor version. Either a parsed {@link EditorVersion}
   * object if parsing was successful or the unparsed string.
   */
  editorVersion: ReleaseVersion | string;
}>;

export type EnvParseError =
  | GetUpmConfigDirError
  | UpmConfigLoadError
  | ProjectVersionLoadError;

function determineCwd(getCwd: GetCwd, options: CmdOptions): string {
  return options._global.chdir !== undefined
    ? path.resolve(options._global.chdir)
    : getCwd();
}

function determineWsl(options: CmdOptions): boolean {
  return options._global.wsl === true;
}

function determinePrimaryRegistry(
  log: Logger,
  options: CmdOptions,
  upmConfig: UPMConfig | null
): Registry {
  const url =
    options._global.registry !== undefined
      ? coerceRegistryUrl(options._global.registry)
      : options._global.cn === true
      ? makeRegistryUrl("https://package.openupm.cn")
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
  const url =
    options._global.cn === true
      ? makeRegistryUrl("https://packages.unity.cn")
      : makeRegistryUrl("https://packages.unity.com");

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

/**
 * Service function for parsing environment information and global
 * command-options for further usage.
 */
export type ParseEnvService = (
  options: CmdOptions
) => Promise<Result<Env, EnvParseError>>;

/**
 * Creates a {@link ParseEnvService} function.
 */
export function makeParseEnvService(
  log: Logger,
  getUpmConfigDir: GetUpmConfigDir,
  loadUpmConfig: LoadUpmConfig,
  getCwd: GetCwd,
  loadProjectVersion: LoadProjectVersion
): ParseEnvService {
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

    // region cn
    if (options._global.cn === true) log.notice("region", "cn");

    // auth
    const systemUser = determineIsSystemUser(options);
    const wsl = determineWsl(options);

    // registries
    const upmConfigResult = await getUpmConfigDir(wsl, systemUser).andThen(
      loadUpmConfig
    ).promise;
    if (upmConfigResult.isErr()) return upmConfigResult;
    const upmConfig = upmConfigResult.value;

    const registry = determinePrimaryRegistry(log, options, upmConfig);
    const upstreamRegistry = determineUpstreamRegistry(options);

    // cwd
    const cwd = determineCwd(getCwd, options);

    // editor version
    const projectVersionLoadResult = await loadProjectVersion(cwd).promise;
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
    const unparsedEditorVersion = projectVersionLoadResult.value;
    const parsedEditorVersion = tryParseEditorVersion(unparsedEditorVersion);
    const editorVersion =
      parsedEditorVersion !== null && isRelease(parsedEditorVersion)
        ? parsedEditorVersion
        : unparsedEditorVersion;

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
}
