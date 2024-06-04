import path from "path";
import TOML from "@iarna/toml";
import { UPMConfig } from "../domain/upm-config";
import { CustomError } from "ts-custom-error";
import { AsyncResult, Err, Ok } from "ts-results-es";
import { ReadTextFile, WriteTextFile } from "./fs-result";
import { tryGetEnv } from "../utils/env-util";
import { StringFormatError, tryParseToml } from "../utils/string-parsing";
import { tryGetWslPath, WslPathError } from "./wsl";
import { ChildProcessError, RunChildProcess } from "./child-process";
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
 * Error which may occur when getting the upmconfig file path.
 */
export type GetUpmConfigPathError =
  | WslPathError
  | RequiredEnvMissingError
  | ChildProcessError;

/**
 * Function which gets the path to the upmconfig file.
 * @param wsl Whether WSL should be treated as Windows.
 * @param systemUser Whether to authenticate as a Windows system-user.
 * @returns The file path.
 */
export type GetUpmConfigPath = (
  wsl: boolean,
  systemUser: boolean
) => AsyncResult<string, GetUpmConfigPathError>;

/**
 * Makes a {@link GetUpmConfigPath} function.
 */
export function makeGetUpmConfigPath(
  getHomePath: GetHomePath,
  runChildProcess: RunChildProcess
): GetUpmConfigPath {
  function getConfigDirectory(wsl: boolean, systemUser: boolean) {
    const systemUserSubPath = "Unity/config/ServiceAccounts";
    if (wsl) {
      if (systemUser)
        return tryGetWslPath("ALLUSERSPROFILE", runChildProcess).map((it) =>
          path.join(it, systemUserSubPath)
        );

      return tryGetWslPath("USERPROFILE", runChildProcess);
    }

    if (systemUser) {
      const profilePath = tryGetEnv("ALLUSERSPROFILE");
      if (profilePath === null)
        return Err(
          new RequiredEnvMissingError(["ALLUSERSPROFILE"])
        ).toAsyncResult();
      return Ok(path.join(profilePath, systemUserSubPath)).toAsyncResult();
    }

    return getHomePath().toAsyncResult();
  }

  return (wsl, systemUser) => {
    return getConfigDirectory(wsl, systemUser).map((directory) =>
      path.join(directory, configFileName)
    );
  };
}

/**
 * Error which may occur when loading a {@link UPMConfig}.
 */
export type UpmConfigLoadError = GenericIOError | StringFormatError<"Toml">;

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
    readFile(configFilePath)
      .andThen(tryParseToml)
      // TODO: Actually validate
      .map((toml) => toml as UPMConfig | null)
      .orElse<UpmConfigLoadError>((error) =>
        !(error instanceof StringFormatError)
          ? error.code === "ENOENT"
            ? Ok(null)
            : Err(new GenericIOError("Read"))
          : Err(error)
      );
}

/**
 * Errors which may occur when saving a UPM-config file.
 */
export type UpmConfigSaveError = GenericIOError;

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
    return writeFile(configFilePath, content).mapErr(
      () => new GenericIOError("Write")
    );
  };
}
