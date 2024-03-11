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
import { Result } from "@badrap/result";
import err = Result.err;
import ok = Result.ok;

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
export const tryGetUpmConfigDir = async (
  wsl: boolean,
  systemUser: boolean
): Promise<Result<string, GetUpmConfigDirError>> => {
  const systemUserSubPath = "Unity/config/ServiceAccounts";
  if (wsl) {
    if (!isWsl) return err(new NoWslError());
    if (systemUser) {
      const allUserProfilePath = await execute(
        'wslpath "$(wslvar ALLUSERSPROFILE)"',
        { trim: true }
      );
      return ok(path.join(allUserProfilePath, systemUserSubPath));
    } else {
      return ok(
        await execute('wslpath "$(wslvar USERPROFILE)"', {
          trim: true,
        })
      );
    }
  } else if (systemUser) {
    if (!process.env.ALLUSERSPROFILE)
      return err(new RequiredEnvMissingError("ALLUSERSPROFILE"));
    return ok(path.join(process.env.ALLUSERSPROFILE, systemUserSubPath));
  } else {
    const dirName = process.env.USERPROFILE ?? process.env.HOME;
    if (dirName === undefined)
      return err(new RequiredEnvMissingError("USERPROFILE", "HOME"));
    return ok(dirName);
  }
};

/**
 * Attempts to load the upm config.
 * @param configDir The directory from which to load the config.
 */
export const loadUpmConfig = async (
  configDir: string
): Promise<UPMConfig | undefined> => {
  const configPath = path.join(configDir, configFileName);
  try {
    const content = await fs.readFile(configPath, "utf8");
    const config = TOML.parse(content);

    // NOTE: We assume correct format
    return config as UPMConfig;
  } catch {
    return undefined;
  }
};

/**
 * Save the upm config.
 * @param config The config to save.
 * @param configDir The directory in which to save the config.
 */
export const saveUpmConfig = async (config: UPMConfig, configDir: string) => {
  try {
    await mkdirp(configDir);
  } catch {
    /* empty */
  }
  const configPath = path.join(configDir, configFileName);
  const content = TOML.stringify(config);
  await fs.writeFile(configPath, content, "utf8");
  log.notice("config", "saved unity config at " + configPath);
};

/**
 * Stores authentication information in the projects upm config.
 */
export const storeUpmAuth = async function (
  configDir: string,
  registry: RegistryUrl,
  auth: UpmAuth
) {
  // Read config file
  let config: UPMConfig = (await loadUpmConfig(configDir)) || {};

  config = addAuth(registry, auth, config);

  // Write config file
  await saveUpmConfig(config, configDir);
};
