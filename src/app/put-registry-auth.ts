import { NpmAuth } from "another-npm-registry-client";
import { encodeBase64 } from "../domain/base64";
import { RegistryUrl } from "../domain/registry-url";
import { type ReadTextFile, type WriteTextFile } from "../io/text-file-io";
import {
  loadUpmConfigUsing,
  saveUpmConfigFileUsing,
  UpmAuth,
  UpmConfigContent,
} from "../io/upm-config-io";
import { partialApply } from "../utils/fp-utils";
import { removeExplicitUndefined } from "../utils/zod-utils";

function mergeEntries(oldEntry: UpmAuth | null, newEntry: NpmAuth): UpmAuth {
  const alwaysAuth = newEntry.alwaysAuth ?? oldEntry?.alwaysAuth;

  if ("token" in newEntry) {
    return removeExplicitUndefined({
      token: newEntry.token,
      email: oldEntry?.email,
      alwaysAuth,
    });
  }

  return removeExplicitUndefined({
    _auth: encodeBase64(`${newEntry.username}:${newEntry.password}`),
    email: newEntry.email,
    alwaysAuth,
  });
}

/**
 * Updates a {@link UpmConfigContent} object to contain auth data for a
 * specific registry.
 * @param currentContent The current upm config content. May be null if there
 * is no config currently.
 * @param registry The registry for which to put the auth data.
 * @param auth The auth data.
 * @returns An updated upm config content with the auth data.
 */
export function putRegistryAuthIntoUpmConfig(
  currentContent: UpmConfigContent | null,
  registry: RegistryUrl,
  auth: NpmAuth
): UpmConfigContent {
  const oldEntries = currentContent?.npmAuth ?? {};
  // Search the entry both with and without trailing slash
  const oldEntry = oldEntries[registry] ?? oldEntries[registry + "/"] ?? null;
  const newContent: UpmConfigContent = removeExplicitUndefined({
    npmAuth: {
      ...oldEntries,
      // Remove entry with trailing slash
      [registry + "/"]: undefined,
      [registry]: mergeEntries(oldEntry, auth),
    },
  });
  return newContent;
}

/**
 * Stores registry authentication.
 * @param readTextFile IO function for reading text files.
 * @param writeTextFile IO function for writing text files.
 * @param configPath Path to the upmconfig file.
 * @param registry Url of the registry for which to authenticate.
 * @param auth Authentication information.
 */
export async function putRegistryAuthUsing(
  readTextFile: ReadTextFile,
  writeTextFile: WriteTextFile,
  configPath: string,
  registry: RegistryUrl,
  auth: NpmAuth
): Promise<void> {
  const loadUpmConfig = partialApply(loadUpmConfigUsing, readTextFile);
  const saveUpmConfig = partialApply(saveUpmConfigFileUsing, writeTextFile);

  const currentContent = await loadUpmConfig(configPath);

  const newContent: UpmConfigContent = putRegistryAuthIntoUpmConfig(
    currentContent,
    registry,
    auth
  );

  await saveUpmConfig(configPath, newContent);
}
