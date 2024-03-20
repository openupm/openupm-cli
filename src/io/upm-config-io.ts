import path from "path";
import TOML from "@iarna/toml";
import log from "../logger";
import isWsl from "is-wsl";
import execute from "../utils/process";
import { addAuth, UpmAuth, UPMConfig } from "../types/upm-config";
import { RegistryUrl } from "../types/registry-url";
import { CustomError } from "ts-custom-error";
import { IOError } from "../common-errors";
import { AsyncResult, Result } from "ts-results-es";
import { assertIsError } from "../utils/error-type-guards";
import { tryReadTextFromFile, tryWriteTextToFile } from "./file-io";

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

export type GetUpmConfigDirError = NoWslError | RequiredEnvMissingError;

/**
 * Gets the path to directory in which the upm config is stored.
 * @param wsl Whether WSL should be treated as Windows.
 * @param systemUser Whether to authenticate as a Windows system-user.
 */
export const tryGetUpmConfigDir = (
  wsl: boolean,
  systemUser: boolean
): AsyncResult<string, GetUpmConfigDirError> => {
  return new AsyncResult(
    Result.wrapAsync(async () => {
      const systemUserSubPath = "Unity/config/ServiceAccounts";
      if (wsl) {
        if (!isWsl) throw new NoWslError();
        if (systemUser) {
          const allUserProfilePath = await execute(
            'wslpath "$(wslvar ALLUSERSPROFILE)"',
            { trim: true }
          );
          return path.join(allUserProfilePath, systemUserSubPath);
        } else {
          return await execute('wslpath "$(wslvar USERPROFILE)"', {
            trim: true,
          });
        }
      } else if (systemUser) {
        if (!process.env.ALLUSERSPROFILE)
          throw new RequiredEnvMissingError("ALLUSERSPROFILE");
        return path.join(process.env.ALLUSERSPROFILE, systemUserSubPath);
      } else {
        const dirName = process.env.USERPROFILE ?? process.env.HOME;
        if (dirName === undefined)
          throw new RequiredEnvMissingError("USERPROFILE", "HOME");
        return dirName;
      }
    })
  );
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
    const config = TOML.parse(content);

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
