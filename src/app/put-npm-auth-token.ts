import { EOL } from "node:os";
import {
  emptyNpmrc,
  getHomeNpmrcPath,
  parseNpmrc,
  serializeNpmrc,
  setToken,
  type Npmrc,
} from "../domain/npmrc";
import { RegistryUrl } from "../domain/registry-url";
import { type ReadTextFile, type WriteTextFile } from "../io/fs";
import type { AuthToken } from "../domain/auth";

/**
 * Stores an auth token in the users `.npmrc` for npm authentication.
 * @param readTextFile IO function for reading text files.
 * @param writeTextFile IO function for writing text files.
 * @param homePath The users home path.
 * @param registry The registry for which to set the auth token.
 * @param token The auth token.
 * @returns The path of the file to which the token was ultimately saved.
 */
export async function saveNpmAuthTokenUsing(
  readTextFile: ReadTextFile,
  writeTextFile: WriteTextFile,
  homePath: string,
  registry: RegistryUrl,
  token: AuthToken
): Promise<string> {
  async function tryLoadNpmrc(path: string): Promise<Npmrc | null> {
    return readTextFile(path).then((content) =>
      content !== null ? parseNpmrc(content) : null
    );
  }

  async function saveNpmrc(path: string, npmrc: Npmrc): Promise<void> {
    const content = serializeNpmrc(EOL, npmrc);
    return await writeTextFile(path, content);
  }

  const configPath = getHomeNpmrcPath(homePath);
  const initial = (await tryLoadNpmrc(configPath)) || emptyNpmrc;
  const updated = setToken(initial, registry, token);
  await saveNpmrc(configPath, updated);
  return configPath;
}
