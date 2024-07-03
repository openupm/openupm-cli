import path from "path";
import TOML from "@iarna/toml";
import { UPMConfig } from "../domain/upm-config";
import { CustomError } from "ts-custom-error";
import { AsyncResult, Result } from "ts-results-es";
import { ReadTextFile, WriteTextFile } from "./text-file-io";
import { tryGetEnv } from "../utils/env-util";
import { tryParseToml } from "../utils/string-parsing";
import { tryGetWslPath } from "./wsl";
import { RunChildProcess } from "./child-process";
import { GetHomePath } from "./special-paths";
import { GenericIOError } from "./common-errors";

const configFileName = ".upmconfig.toml";

export class RequiredEnvMissingError extends CustomError {
  private readonly _class = "RequiredEnvMissingError";
  constructor(public readonly keyNames: string[]) {
    super(
      `Env was required to contain a value for one of the following keys, but all were missing: ${keyNames
        .map((keyName) => `"${keyName}"`)
        .join(", ")}.`
    );
  }
}

/**
 * Function which gets the path to the upmconfig file.
 * @param wsl Whether WSL should be treated as Windows.
 * @param systemUser Whether to authenticate as a Windows system-user.
 * @returns The file path.
 */
export type GetUpmConfigPath = (
  wsl: boolean,
  systemUser: boolean
) => Promise<string>;

/**
 * Makes a {@link GetUpmConfigPath} function.
 */
export function makeGetUpmConfigPath(
  getHomePath: GetHomePath,
  runChildProcess: RunChildProcess
): GetUpmConfigPath {
  async function getConfigDirectory(wsl: boolean, systemUser: boolean) {
    const systemUserSubPath = "Unity/config/ServiceAccounts";
    if (wsl) {
      if (systemUser)
        return await tryGetWslPath("ALLUSERSPROFILE", runChildProcess).then(
          (it) => path.join(it, systemUserSubPath)
        );

      return await tryGetWslPath("USERPROFILE", runChildProcess);
    }

    if (systemUser) {
      const profilePath = tryGetEnv("ALLUSERSPROFILE");
      if (profilePath === null)
        throw new RequiredEnvMissingError(["ALLUSERSPROFILE"]);
      return path.join(profilePath, systemUserSubPath);
    }

    return getHomePath();
  }

  return async (wsl, systemUser) => {
    const directory = await getConfigDirectory(wsl, systemUser);
    return path.join(directory, configFileName);
  };
}

/**
 * Error which may occur when loading a {@link UPMConfig}.
 */
export type UpmConfigLoadError = GenericIOError;

/**
 * IO function for loading an upm-config file.
 * @param configFilePath Path of the upm-config file.
 * @returns The config or null if it was not found.
 */
export type LoadUpmConfig = (
  configFilePath: string
) => AsyncResult<UPMConfig | null, UpmConfigLoadError>;

/**
 * Makes a {@link LoadUpmConfig} function.
 */
export function makeLoadUpmConfig(readFile: ReadTextFile): LoadUpmConfig {
  return (configFilePath) =>
    new AsyncResult(
      Result.wrapAsync<string | null, GenericIOError>(() =>
        readFile(configFilePath, true)
      )
    )
      .map((content) => (content !== null ? tryParseToml(content) : null))
      // TODO: Actually validate
      .map((toml) => toml as UPMConfig | null);
}

/**
 * Errors which may occur when saving a UPM-config file.
 */
export type UpmConfigSaveError = never;

/**
 * Save the upm config.
 * @param config The config to save.
 * @param configFilePath The path of the file that should be saved to.
 */
export type SaveUpmConfig = (
  config: UPMConfig,
  configFilePath: string
) => AsyncResult<void, UpmConfigSaveError>;

/**
 * Creates a {@link SaveUpmConfig} function.
 */
export function makeSaveUpmConfig(writeFile: WriteTextFile): SaveUpmConfig {
  return (config, configFilePath) => {
    const content = TOML.stringify(config);
    return new AsyncResult(
      Result.wrapAsync(() => writeFile(configFilePath, content))
    );
  };
}
