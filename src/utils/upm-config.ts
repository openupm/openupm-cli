import { UPMConfig } from "../types/global";
import mkdirp from "mkdirp";
import path from "path";
import TOML from "@iarna/toml";
import fs from "fs";
import log from "../logger";
import isWsl from "is-wsl";
import execute from "./process";
import { env } from "./env";

/**
 * Gets the path to directory in which the upm config is stored
 */
export const getUpmConfigDir = async (): Promise<string> => {
  let dirPath: string | undefined = "";
  const systemUserSubPath = "Unity/config/ServiceAccounts";
  if (env.wsl) {
    if (!isWsl) {
      throw new Error("no WSL detected");
    }
    if (env.systemUser) {
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
    if (env.systemUser) {
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
 */
export const loadUpmConfig = async (
  configDir?: string
): Promise<UPMConfig | undefined> => {
  if (configDir === undefined) configDir = await getUpmConfigDir();
  const configPath = path.join(configDir, ".upmconfig.toml");
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, "utf8");
    const config = TOML.parse(content);

    // NOTE: We assume correct format
    return config as UPMConfig;
  }
};

/**
 * Save the upm config
 */
export const saveUpmConfig = async (config: UPMConfig, configDir: string) => {
  if (configDir === undefined) configDir = await getUpmConfigDir();
  mkdirp.sync(configDir);
  const configPath = path.join(configDir, ".upmconfig.toml");
  const content = TOML.stringify(config);
  fs.writeFileSync(configPath, content, "utf8");
  log.notice("config", "saved unity config at " + configPath);
};