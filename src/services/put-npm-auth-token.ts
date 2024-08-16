import { emptyNpmrc, setToken } from "../domain/npmrc";
import { RegistryUrl } from "../domain/registry-url";
import {
  findNpmrcPath,
  FindNpmrcPath,
  loadNpmrc,
  LoadNpmrc,
  saveNpmrc,
  SaveNpmrc,
} from "../io/npmrc-io";

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
  findPath: FindNpmrcPath,
  loadNpmrc: LoadNpmrc,
  saveNpmrc: SaveNpmrc
): StoreNpmAuthToken {
  return async (registry, token) => {
    const configPath = findPath();
    const initial = (await loadNpmrc(configPath)) || emptyNpmrc;
    const updated = setToken(initial, registry, token);
    await saveNpmrc(configPath, updated);
    return configPath;
  };
}

/**
 * Default {@link StoreNpmAuthToken} function. Uses {@link StoreNpmAuthTokenInNpmrc}.
 */
export const putNpmAuthToken = (homePath: string) =>
  StoreNpmAuthTokenInNpmrc(findNpmrcPath(homePath), loadNpmrc, saveNpmrc);
