import path from "path";
import TOML from "@iarna/toml";
import log from "../cli/logger";
import { addAuth, UpmAuth, UPMConfig } from "../domain/upm-config";
import { RegistryUrl } from "../domain/registry-url";
import { CustomError } from "ts-custom-error";
import { AsyncResult, Err, Ok } from "ts-results-es";
import {
  IOError,
  NotFoundError,
  tryReadTextFromFile,
  tryWriteTextToFile,
} from "./file-io";
import { tryGetEnv } from "../utils/env-util";
import { tryGetHomePath } from "./special-paths";
import { StringFormatError, tryParseToml } from "../utils/string-parsing";
import { tryGetWslPath, WslPathError } from "./wls";
import { ChildProcessError } from "../utils/process";

const configFileName = ".upmconfig.toml";

export class RequiredEnvMissingError extends CustomError {
  private readonly _class = "RequiredEnvMissingError";
  constructor(...keyNames: string[]) {
    super(
      `Env was required to contain a value for one of the following keys, but all were missing: ${keyNames
        .map((keyName) => `"${keyName}"`)
        .join(", ")}.`
    );
  }
}

export type GetUpmConfigDirError =
  | WslPathError
  | RequiredEnvMissingError
  | ChildProcessError;

export type UpmConfigLoadError = IOError | StringFormatError;

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
    if (systemUser)
      return tryGetWslPath("ALLUSERSPROFILE").map((it) =>
        path.join(it, systemUserSubPath)
      );

    return tryGetWslPath("USERPROFILE");
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
export const tryLoadUpmConfig = (
  configDir: string
): AsyncResult<UPMConfig | null, UpmConfigLoadError> => {
  const configPath = path.join(configDir, configFileName);

  return (
    tryReadTextFromFile(configPath)
      .andThen(tryParseToml)
      // TODO: Actually validate
      .map<UPMConfig | null>((toml) => toml as UPMConfig)
      .orElse((error) =>
        error instanceof NotFoundError ? Ok(null) : Err(error)
      )
  );
};

/**
 * Errors which may occur when saving a UPM-config file.
 */
export type UpmConfigSaveError = IOError;

/**
 * Save the upm config.
 * @param config The config to save.
 * @param configDir The directory in which to save the config.
 * @return The path to which the file was saved.
 */
export const trySaveUpmConfig = (
  config: UPMConfig,
  configDir: string
): AsyncResult<string, UpmConfigSaveError> => {
  const configPath = path.join(configDir, configFileName);
  const content = TOML.stringify(config);
  return tryWriteTextToFile(configPath, content).map(() => configPath);
};

/**
 * Errors which may occur when storing an {@link UpmAuth} to the file-system.
 */
export type UpmAuthStoreError = UpmConfigLoadError | IOError;

/**
 * Stores authentication information in the projects upm config.
 */
export const tryStoreUpmAuth = function (
  configDir: string,
  registry: RegistryUrl,
  auth: UpmAuth
): AsyncResult<void, UpmAuthStoreError> {
  return tryLoadUpmConfig(configDir)
    .map((maybeConfig) => maybeConfig || {})
    .map((config) => addAuth(registry, auth, config))
    .andThen((config) => trySaveUpmConfig(config, configDir))
    .map((configPath) =>
      log.notice("config", "saved unity config at " + configPath)
    );
};
