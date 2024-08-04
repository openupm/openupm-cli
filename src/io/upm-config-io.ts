import path from "path";
import TOML from "@iarna/toml";
import { ReadTextFile, WriteTextFile } from "./text-file-io";
import { tryGetEnv } from "../utils/env-util";
import { tryGetWslPath } from "./wsl";
import { RunChildProcess } from "./child-process";
import { GetHomePath } from "./special-paths";
import { CustomError } from "ts-custom-error";
import { z } from "zod";
import {
  removeExplicitUndefined,
  RemoveExplicitUndefined,
} from "../utils/zod-utils";
import { UPMConfig } from "../domain/upm-config";
import { Base64 } from "../domain/base64";

const configFileName = ".upmconfig.toml";

export class NoSystemUserProfilePath extends CustomError {}

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
      if (profilePath === null) throw new NoSystemUserProfilePath();
      return path.join(profilePath, systemUserSubPath);
    }

    return getHomePath();
  }

  return async (wsl, systemUser) => {
    const directory = await getConfigDirectory(wsl, systemUser);
    return path.join(directory, configFileName);
  };
}

const authBaseSchema = z.object({
  alwaysAuth: z.optional(z.boolean()),
});

const basicAuthSchema = authBaseSchema.and(
  z.object({
    email: z.string().email(),
    _auth: Base64,
  })
);

const tokenAuthSchema = authBaseSchema.and(
  z.object({
    email: z.optional(z.string().email()),
    token: z.string(),
  })
);

const upmAuthSchema = basicAuthSchema.or(tokenAuthSchema);

const upmConfigContentSchema = z.object({
  npmAuth: z.optional(z.record(z.string(), upmAuthSchema)),
});

/**
 * Schema for an entry in a .upmconfig.toml file.
 */
export type UpmAuth = RemoveExplicitUndefined<z.TypeOf<typeof upmAuthSchema>>;

/**
 * The content of a .upmconfig.toml file.
 */
export type UpmConfigContent = RemoveExplicitUndefined<
  z.TypeOf<typeof upmConfigContentSchema>
>;

/**
 * IO function for loading an upm-config file.
 * @param configFilePath Path of the upm-config file.
 * @returns The config or null if it was not found.
 */
export type LoadUpmConfig = (
  configFilePath: string
) => Promise<UpmConfigContent | null>;

/**
 * Makes a {@link LoadUpmConfig} function.
 */
export function makeLoadUpmConfig(readFile: ReadTextFile): LoadUpmConfig {
  return async (configFilePath) => {
    const stringContent = await readFile(configFilePath, true);
    if (stringContent === null) return null;
    const tomlContent = TOML.parse(stringContent);
    return removeExplicitUndefined(upmConfigContentSchema.parse(tomlContent));
  };
}

/**
 * Save the upm config.
 * @param config The config to save.
 * @param configFilePath The path of the file that should be saved to.
 */
export type SaveUpmConfig = (
  config: UpmConfigContent,
  configFilePath: string
) => Promise<void>;

/**
 * Creates a {@link SaveUpmConfig} function.
 */
export function makeSaveUpmConfig(writeFile: WriteTextFile): SaveUpmConfig {
  return (config, configFilePath) => {
    const content = TOML.stringify(config);
    return writeFile(configFilePath, content);
  };
}
