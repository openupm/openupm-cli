import path from "path";
import TOML from "@iarna/toml";
import { addAuth, UpmAuth, UPMConfig } from "../domain/upm-config";
import { RegistryUrl } from "../domain/registry-url";
import { CustomError } from "ts-custom-error";
import { AsyncResult, Err, Ok } from "ts-results-es";
import { IOError, NotFoundError, ReadTextFile, WriteTextFile } from "./file-io";
import { tryGetEnv } from "../utils/env-util";
import { StringFormatError, tryParseToml } from "../utils/string-parsing";
import { tryGetWslPath, WslPathError } from "./wsl";
import { ChildProcessError } from "../utils/process";
import { GetHomePath } from "./special-paths";

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

/**
 * Error which may occur when getting the upmconfig directory.
 */
export type GetUpmConfigDirError =
  | WslPathError
  | RequiredEnvMissingError
  | ChildProcessError;

/**
 * Function which gets the path to directory in which the upm config is stored.
 * @param wsl Whether WSL should be treated as Windows.
 * @param systemUser Whether to authenticate as a Windows system-user.
 * @returns The directories path.
 */
export type GetUpmConfigDir = (
  wsl: boolean,
  systemUser: boolean
) => AsyncResult<string, GetUpmConfigDirError>;

/**
 * Makes a {@link GetUpmConfigDir} function.
 */
export function makeUpmConfigDirGetter(
  getHomePath: GetHomePath
): GetUpmConfigDir {
  return (wsl, systemUser) => {
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

    return getHomePath().toAsyncResult();
  };
}

/**
 * Error which may occur when loading a {@link UPMConfig}.
 */
export type UpmConfigLoadError = IOError | StringFormatError;

/**
 * IO function for loading an upm-config from a directory.
 * @param directory The directory in which to search for the upm-config.
 * @returns The config or null if it was not found.
 */
export type LoadUpmConfig = (
  directory: string
) => AsyncResult<UPMConfig | null, UpmConfigLoadError>;

/**
 * Makes a {@link LoadUpmConfig} function.
 */
export function makeUpmConfigLoader(readFile: ReadTextFile): LoadUpmConfig {
  return (directory) => {
    const configPath = path.join(directory, configFileName);

    return (
      readFile(configPath)
        .andThen(tryParseToml)
        // TODO: Actually validate
        .map<UPMConfig | null>((toml) => toml as UPMConfig)
        .orElse((error) =>
          error instanceof NotFoundError ? Ok(null) : Err(error)
        )
    );
  };
}

/**
 * Errors which may occur when saving a UPM-config file.
 */
export type UpmConfigSaveError = IOError;

/**
 * Save the upm config.
 * @param config The config to save.
 * @param configDir The directory in which to save the config.
 * @returns The path to which the file was saved.
 */
export const trySaveUpmConfig = (
  writeFile: WriteTextFile,
  config: UPMConfig,
  configDir: string
): AsyncResult<string, UpmConfigSaveError> => {
  const configPath = path.join(configDir, configFileName);
  const content = TOML.stringify(config);
  return writeFile(configPath, content).map(() => configPath);
};

/**
 * Errors which may occur when storing an {@link UpmAuth} to the file-system.
 */
export type UpmAuthStoreError = UpmConfigLoadError | IOError;

/**
 * Stores authentication information in the projects upm config.
 */
export const tryStoreUpmAuth = function (
  loadUpmConfig: LoadUpmConfig,
  writeFile: WriteTextFile,
  configDir: string,
  registry: RegistryUrl,
  auth: UpmAuth
): AsyncResult<string, UpmAuthStoreError> {
  return loadUpmConfig(configDir)
    .map((maybeConfig) => maybeConfig || {})
    .map((config) => addAuth(registry, auth, config))
    .andThen((config) => trySaveUpmConfig(writeFile, config, configDir));
};
