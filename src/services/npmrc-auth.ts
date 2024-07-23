import { RegistryUrl } from "../domain/registry-url";
import { FindNpmrcPath, LoadNpmrc, SaveNpmrc } from "../io/npmrc-io";
import { emptyNpmrc, setToken } from "../domain/npmrc";

/**
 * Function for updating the user-wide npm-auth token inside a users
 * npmrc file.
 * @param registry The registry for which to set the auth token.
 * @param token The auth token.
 * @returns The path of the file to which the token was ultimately saved.
 */
export type AuthNpmrc = (
  registry: RegistryUrl,
  token: string
) => Promise<string>;

/**
 * Makes a {@link AuthNpmrc} service function.
 */
export function makeAuthNpmrc(
  findPath: FindNpmrcPath,
  loadNpmrc: LoadNpmrc,
  saveNpmrc: SaveNpmrc
): AuthNpmrc {
  return async (registry, token) => {
    const configPath = findPath();
    const initial = (await loadNpmrc(configPath)) || emptyNpmrc;
    const updated = setToken(initial, registry, token);
    await saveNpmrc(configPath, updated);
    return configPath;
  };
}
