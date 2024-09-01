import { emptyNpmrc, setToken } from "../domain/npmrc";
import { RegistryUrl } from "../domain/registry-url";
import {
  getHomeNpmrcPath,
  saveNpmrc,
  SaveNpmrc,
  tryLoadNpmrcUsing,
} from "../io/npmrc-io";
import { readTextFile, type ReadTextFile } from "../io/text-file-io";
import { partialApply } from "../utils/fp-utils";

/**
 * Function for storing an auth token used for npm authentication.
 * @param registry The registry for which to set the auth token.
 * @param token The auth token.
 * @returns The path of the file to which the token was ultimately saved.
 */
export type StoreNpmAuthToken = (
  registry: RegistryUrl,
  token: string
) => Promise<string>;

/**
 * Makes a {@link StoreNpmAuthToken} service function which stores the token
 * inside the users `.npmrc` file.
 */
export function StoreNpmAuthTokenInNpmrc(
  readTextFile: ReadTextFile,
  saveNpmrc: SaveNpmrc,
  homePath: string
): StoreNpmAuthToken {
  const tryLoadNpmrc = partialApply(tryLoadNpmrcUsing, readTextFile);

  return async (registry, token) => {
    const configPath = getHomeNpmrcPath(homePath);
    const initial = (await tryLoadNpmrc(configPath)) || emptyNpmrc;
    const updated = setToken(initial, registry, token);
    await saveNpmrc(configPath, updated);
    return configPath;
  };
}

/**
 * Default {@link StoreNpmAuthToken} function. Uses {@link StoreNpmAuthTokenInNpmrc}.
 */
export const putNpmAuthToken = (homePath: string) =>
  StoreNpmAuthTokenInNpmrc(readTextFile, saveNpmrc, homePath);
