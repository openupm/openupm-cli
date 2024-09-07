import { emptyNpmrc, getHomeNpmrcPath, setToken } from "../domain/npmrc";
import { RegistryUrl } from "../domain/registry-url";
import { type ReadTextFile, type WriteTextFile } from "../io/text-file-io";
import { partialApply } from "../domain/fp-utils";
import { saveNpmrcUsing, tryLoadNpmrcUsing } from "./npmrc-io";

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
  token: string
): Promise<string> {
  const tryLoadNpmrc = partialApply(tryLoadNpmrcUsing, readTextFile);
  const saveNpmrc = partialApply(saveNpmrcUsing, writeTextFile);

  const configPath = getHomeNpmrcPath(homePath);
  const initial = (await tryLoadNpmrc(configPath)) || emptyNpmrc;
  const updated = setToken(initial, registry, token);
  await saveNpmrc(configPath, updated);
  return configPath;
}
