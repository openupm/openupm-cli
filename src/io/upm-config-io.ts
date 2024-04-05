import path from "path";
import TOML from "@iarna/toml";
import log from "../cli/logger";
import isWsl from "is-wsl";
import execute, { ChildProcessError } from "../utils/process";
import { addAuth, UpmAuth, UPMConfig } from "../domain/upm-config";
import { RegistryUrl } from "../domain/registry-url";
import { CustomError } from "ts-custom-error";
import { IOError } from "../common-errors";
import { AsyncResult, Err, Ok, Result } from "ts-results-es";
import { assertIsError } from "../utils/error-type-guards";
import { tryReadTextFromFile, tryWriteTextToFile } from "./file-io";
import { tryGetEnv } from "../utils/env-util";
import { tryGetHomePath } from "./home";
import { tryParseToml } from "../utils/data-parsing";

const configFileName = ".upmconfig.toml";

export class NoWslError extends CustomError {
  constructor() {
    super("No WSL detected.");
  }
}

export class RequiredEnvMissingError extends CustomError {
  constructor(...keyNames: string[]) {
    super(
      `Env was required to contain a value for one of the following keys, but all were missing: ${keyNames
        .map((keyName) => `"${keyName}"`)
        .join(", ")}.`
    );
  }
}

export type GetUpmConfigDirError =
  | NoWslError
  | RequiredEnvMissingError
  | ChildProcessError;

/**
 * Gets the path to directory in which the upm config is stored.
 * @param wsl Whether WSL should be treated as Windows.
 * @param systemUser Whether to authenticate as a Windows system-user.
 */
export const tryGetUpmConfigDir = (
  wsl: boolean,
  systemUser: boolean
): AsyncResult<string, GetUpmConfigDirError> => {
  const systemUserSubPath = "Unity/config/ServiceAccounts";
  if (wsl) {
    if (!isWsl) return Err(new NoWslError()).toAsyncResult();

    if (systemUser) {
      return execute('wslpath "$(wslvar ALLUSERSPROFILE)"', {
        trim: true,
      }).map((it) => path.join(it, systemUserSubPath));
    }

    return execute('wslpath "$(wslvar USERPROFILE)"', {
      trim: true,
    });
  }

  if (systemUser) {
    const profilePath = tryGetEnv("ALLUSERSPROFILE");
    if (profilePath === null)
      return Err(
        new RequiredEnvMissingError("ALLUSERSPROFILE")
      ).toAsyncResult();
    return Ok(path.join(profilePath, systemUserSubPath)).toAsyncResult();
  }

  return tryGetHomePath().toAsyncResult();
};

/**
 * Attempts to load the upm config.
 * @param configDir The directory from which to load the config.
 * @returns The config or null if not found.
 */
export const tryLoadUpmConfig = async (
  configDir: string
): Promise<UPMConfig | null> => {
  const configPath = path.join(configDir, configFileName);
  try {
    // TODO:
    //  Instead of unwrapping here and risking a throw that is then
    //  immediately caught, we should make this function return a result
    //  and use mapping.
    const content = (await tryReadTextFromFile(configPath).promise).unwrap();
    const config = tryParseToml(content).unwrap();

    // NOTE: We assume correct format
    return config as UPMConfig;
  } catch {
    return null;
  }
};

/**
 * Save the upm config.
 * @param config The config to save.
 * @param configDir The directory in which to save the config.
 * @return The path to which the file was saved.
 */
export const trySaveUpmConfig = (
  config: UPMConfig,
  configDir: string
): AsyncResult<string, IOError> => {
  const configPath = path.join(configDir, configFileName);
  const content = TOML.stringify(config);
  return tryWriteTextToFile(configPath, content).map(() => configPath);
};

/**
 * Stores authentication information in the projects upm config.
 */
export const tryStoreUpmAuth = function (
  configDir: string,
  registry: RegistryUrl,
  auth: UpmAuth
): AsyncResult<void, IOError> {
  return new AsyncResult(Result.wrapAsync(() => tryLoadUpmConfig(configDir)))
    .mapErr((error) => {
      assertIsError(error);
      return error;
    })
    .map((maybeConfig) => maybeConfig || {})
    .map((config) => addAuth(registry, auth, config))
    .andThen((config) => trySaveUpmConfig(config, configDir))
    .map((configPath) =>
      log.notice("config", "saved unity config at " + configPath)
    );
};
