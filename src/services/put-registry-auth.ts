import { RegistryUrl } from "../domain/registry-url";
import {
  LoadUpmConfig,
  SaveUpmConfig,
  UpmAuth,
  UpmConfigContent,
} from "../io/upm-config-io";
import { NpmAuth } from "another-npm-registry-client";
import { removeExplicitUndefined } from "../utils/zod-utils";
import { encodeBase64 } from "../domain/base64";

/**
 * Service function for storing registry authentication. Internally this
 * will write it to the upmconfig.toml file.
 * @param configPath Path to the upmconfig file.
 * @param registry Url of the registry for which to authenticate.
 * @param auth Authentication information.
 */
export type PutRegistryAuth = (
  configPath: string,
  registry: RegistryUrl,
  auth: NpmAuth
) => Promise<void>;
/**
 * Makes a {@link PutRegistryAuth} function.
 */
export function makePutRegistryAuth(
  loadUpmConfig: LoadUpmConfig,
  saveUpmConfig: SaveUpmConfig
): PutRegistryAuth {
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

  return async (configPath, registry, auth) => {
    const currentContent = await loadUpmConfig(configPath);

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
    await saveUpmConfig(newContent, configPath);
  };
}
