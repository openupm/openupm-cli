import TOML from "@iarna/toml";
import path from "path";
import { CustomError } from "ts-custom-error";
import { z } from "zod";
import { Base64 } from "../domain/base64";
import { tryGetEnv } from "../utils/env-util";
import {
  removeExplicitUndefined,
  RemoveExplicitUndefined,
} from "../utils/zod-utils";
import { GetHomePath, getHomePathFromEnv } from "./special-paths";
import {
  readTextFile,
  ReadTextFile,
  writeTextFile,
  WriteTextFile,
} from "./text-file-io";

const configFileName = ".upmconfig.toml";

export class NoSystemUserProfilePath extends CustomError {}

/**
 * Function which gets the path to the upmconfig file.
 * @param systemUser Whether to authenticate as a Windows system-user.
 * @returns The file path.
 */
export type GetUpmConfigPath = (systemUser: boolean) => Promise<string>;

/**
 * Makes a {@link GetUpmConfigPath} function which resolves to the default
 * location of the `.upmconfig.toml` file.
 * @see https://docs.unity3d.com/Manual/upm-config.html#upmconfig
 */
export function ResolveDefaultUpmConfigPath(
  getHomePath: GetHomePath
): GetUpmConfigPath {
  async function getConfigDirectory(systemUser: boolean) {
    const systemUserSubPath = "Unity/config/ServiceAccounts";
    if (systemUser) {
      const profilePath = tryGetEnv("ALLUSERSPROFILE");
      if (profilePath === null) throw new NoSystemUserProfilePath();
      return path.join(profilePath, systemUserSubPath);
    }

    return getHomePath();
  }

  return async (systemUser) => {
    const directory = await getConfigDirectory(systemUser);
    return path.join(directory, configFileName);
  };
}

/**
 * Default {@link GetUpmConfigPath} function. Uses {@link ResolveDefaultUpmConfigPath}.
 */
export const getUpmConfigPath: GetUpmConfigPath =
  ResolveDefaultUpmConfigPath(getHomePathFromEnv);

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
 * Makes a {@link LoadUpmConfig} function which reads the content of a
 * `.upmconfig.toml` file.
 */
export function ReadUpmConfigFile(readFile: ReadTextFile): LoadUpmConfig {
  return async (configFilePath) => {
    const stringContent = await readFile(configFilePath, true);
    if (stringContent === null) return null;
    const tomlContent = TOML.parse(stringContent);
    return removeExplicitUndefined(upmConfigContentSchema.parse(tomlContent));
  };
}

/**
 * Default {@link LoadUpmConfig} function. Uses {@link ReadUpmConfigFile}.
 */
export const loadUpmConfig: LoadUpmConfig = ReadUpmConfigFile(readTextFile);

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
 * Creates a {@link SaveUpmConfig} function which overwrites the content
 * of a `.upmconfig.toml` file.
 */
export function WriteUpmConfigFile(writeFile: WriteTextFile): SaveUpmConfig {
  return (config, configFilePath) => {
    const content = TOML.stringify(config);
    return writeFile(configFilePath, content);
  };
}

/**
 * Default {@link SaveUpmConfig} function. Uses {@link WriteUpmConfigFile}.
 */
export const saveUpmConfig: SaveUpmConfig = WriteUpmConfigFile(writeTextFile);
