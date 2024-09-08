import TOML from "@iarna/toml";
import path from "path";
import { CustomError } from "ts-custom-error";
import { z } from "zod";
import { Base64 } from "./base64";
import {
  type RemoveExplicitUndefined,
  removeExplicitUndefined,
} from "./zod-utils";

/**
 * The file name for upm config files.
 */
export const upmConfigFileName = ".upmconfig.toml";

export class NoSystemUserProfilePath extends CustomError {}

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
export type UpmConfigEntry = RemoveExplicitUndefined<
  z.TypeOf<typeof upmAuthSchema>
>;

/**
 * The content of a .upmconfig.toml file.
 */
export type UpmConfig = RemoveExplicitUndefined<
  z.TypeOf<typeof upmConfigContentSchema>
>;

/**
 * Determines the path to the users `.upmconfig.toml` file, based on the
 * given parameters.
 * @param envVars The current environment variables.
 * @param homePath The users home path.
 * @param forSystemUser Whether to get the path for the system user instead
 * of the current one.
 * @returns The resolved path.
 * @throws {NoSystemUserProfilePath} When trying to get the path for the
 * system-user but the `ALLUSERSPROFILE` env var is not set.
 * @see https://docs.unity3d.com/Manual/upm-config.html
 */
export function getUserUpmConfigPathFor(
  envVars: Record<string, string | undefined>,
  homePath: string,
  forSystemUser: boolean
): string {
  function getConfigDirectory() {
    const systemUserSubPath = "Unity/config/ServiceAccounts";
    if (forSystemUser) {
      const profilePath = envVars["ALLUSERSPROFILE"];
      if (profilePath === undefined) throw new NoSystemUserProfilePath();
      return path.join(profilePath, systemUserSubPath);
    }

    return homePath;
  }

  const customDir = envVars["UPM_USER_CONFIG_FILE"];
  if (customDir !== undefined) return path.resolve(customDir);

  const directory = getConfigDirectory();
  return path.join(directory, upmConfigFileName);
}

/**
 * Parses the content of a `.upmconfig.toml` file.
 * @param fileContent The file content.
 * @returns The parsed content.
 */
export function parseUpmConfig(fileContent: string): UpmConfig {
  const tomlContent = TOML.parse(fileContent);
  return removeExplicitUndefined(upmConfigContentSchema.parse(tomlContent));
}

/**
 * Serializes a upm config to string.
 * @param config The config.
 * @returns The serialized string.
 */
export function serializeUpmConfig(config: UpmConfig): string {
  return TOML.stringify(config);
}
