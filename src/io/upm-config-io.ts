import TOML from "@iarna/toml";
import { z } from "zod";
import { Base64 } from "../domain/base64";
import {
  removeExplicitUndefined,
  RemoveExplicitUndefined,
} from "../utils/zod-utils";
import { ReadTextFile, writeTextFile, WriteTextFile } from "./text-file-io";

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
 * Parses the content of a `.upmconfig.toml` file.
 * @param fileContent The file content.
 * @returns The parsed content.
 */
export function parseUpmConfig(fileContent: string): UpmConfigContent {
  const tomlContent = TOML.parse(fileContent);
  return removeExplicitUndefined(upmConfigContentSchema.parse(tomlContent));
}

/**
 * Loads an upm-config file.
 * @param readFile IO function for reading the file.
 * @param filePath Path of the upm-config file.
 * @returns The config or null if it was not found.
 */
export async function loadUpmConfigUsing(
  readFile: ReadTextFile,
  filePath: string
): Promise<UpmConfigContent | null> {
  const stringContent = await readFile(filePath);
  if (stringContent === null) return null;
  return parseUpmConfig(stringContent);
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
