import mkdirp from "mkdirp";
import path from "path";
import TOML from "@iarna/toml";
import fs from "fs";
import log from "../logger";
import isWsl from "is-wsl";
import execute from "./process";
import { UPMConfig } from "../types/upm-config";

const configFileName = ".upmconfig.toml";

/**
 * Gets the path to directory in which the upm config is stored
 * @param wsl Whether WSL should be treated as Windows
 * @param systemUser Whether to authenticate as a Windows system-user
 * @throws Error Could not determine upm config directory
 */
export const getUpmConfigDir = async (
  wsl: boolean,
  systemUser: boolean
): Promise<string> => {
  let dirPath: string | undefined = "";
  const systemUserSubPath = "Unity/config/ServiceAccounts";
  if (wsl) {
    if (!isWsl) {
      throw new Error("no WSL detected");
    }
    if (systemUser) {
      const allUserProfilePath = await execute(
        'wslpath "$(wslvar ALLUSERSPROFILE)"',
        { trim: true }
      );
      dirPath = path.join(allUserProfilePath, systemUserSubPath);
    } else {
      dirPath = await execute('wslpath "$(wslvar USERPROFILE)"', {
        trim: true,
      });
    }
  } else {
    dirPath = process.env.USERPROFILE
      ? process.env.USERPROFILE
      : process.env.HOME;
    if (systemUser) {
      if (!process.env.ALLUSERSPROFILE) {
        throw new Error("env ALLUSERSPROFILE is empty");
      }
      dirPath = path.join(process.env.ALLUSERSPROFILE, systemUserSubPath);
    }
  }
  if (dirPath === undefined)
    throw new Error("Could not resolve upm-config dir-path");
  return dirPath;
};

/**
 * Attempts to load the upm config
 * @param configDir The directory from which to load the config
 */
export const loadUpmConfig = async (
  configDir: string
): Promise<UPMConfig | undefined> => {
  const configPath = path.join(configDir, configFileName);
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, "utf8");
    const config = TOML.parse(content);

    // NOTE: We assume correct format
    return config as UPMConfig;
  }
};

/**
 * Save the upm config
 * @param config The config to save
 * @param configDir The directory in which to save the config
 */
export const saveUpmConfig = async (config: UPMConfig, configDir: string) => {
  mkdirp.sync(configDir);
  const configPath = path.join(configDir, configFileName);
  const content = TOML.stringify(config);
  fs.writeFileSync(configPath, content, "utf8");
  log.notice("config", "saved unity config at " + configPath);
};
