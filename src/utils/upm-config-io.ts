import { mkdirp } from "mkdirp";
import path from "path";
import TOML from "@iarna/toml";
import fs from "fs/promises";
import log from "../logger";
import isWsl from "is-wsl";
import execute from "./process";
import { addAuth, UpmAuth, UPMConfig } from "../types/upm-config";
import { RegistryUrl } from "../types/registry-url";
import { CustomError } from "ts-custom-error";
import { IOError } from "../common-errors";
import { assertIsError } from "./error-type-guards";
import { AsyncResult, Err, Ok, Result } from "ts-results-es";

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
    const content = await fs.readFile(configPath, "utf8");
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
 */
export const trySaveUpmConfig = async (
  config: UPMConfig,
  configDir: string
): Promise<Result<void, IOError>> => {
  try {
    await mkdirp(configDir);
    const configPath = path.join(configDir, configFileName);
    const content = TOML.stringify(config);
    await fs.writeFile(configPath, content, "utf8");
    log.notice("config", "saved unity config at " + configPath);
    return Ok(undefined);
  } catch (error) {
    assertIsError(error);
    return Err(error);
  }
};

/**
 * Stores authentication information in the projects upm config.
 */
export const tryStoreUpmAuth = async function (
  configDir: string,
  registry: RegistryUrl,
  auth: UpmAuth
): Promise<Result<void, IOError>> {
  // Read config file
  let config = (await tryLoadUpmConfig(configDir)) || {};

  config = addAuth(registry, auth, config);

  // Write config file
  return await trySaveUpmConfig(config, configDir);
};
