import { NpmAuth } from "another-npm-registry-client";
import { decodeBase64 } from "../domain/base64";
import { Registry } from "../domain/registry";
import {
  openupmRegistryUrl,
  RegistryUrl,
  unityRegistryUrl,
} from "../domain/registry-url";
import {
  getUpmConfigPath,
  GetUpmConfigPath,
  loadUpmConfig,
  LoadUpmConfig,
  UpmAuth,
  UpmConfigContent,
} from "../io/upm-config-io";
import { DebugLog, npmDebugLog } from "../logging";
import { trySplitAtFirstOccurrenceOf } from "../utils/string-utils";
import { removeExplicitUndefined } from "../utils/zod-utils";

/**
 * Service function for getting registry authentication.
 * @param systemUser Whether to authenticate as a Windows system-user.
 * @param url The url for which to get authentication.
 */
export type GetRegistryAuth = (
  systemUser: boolean,
  url: RegistryUrl
) => Promise<Registry>;

/**
 * Makes a {@link GetRegistryAuth} function which gets it's information from
 * the users upm config.
 */
export function LoadRegistryAuthFromUpmConfig(
  getUpmConfigPath: GetUpmConfigPath,
  loadUpmConfig: LoadUpmConfig,
  debugLog: DebugLog
): GetRegistryAuth {
  function importNpmAuth(input: UpmAuth): NpmAuth {
    // Basic auth
    if ("_auth" in input) {
      const decoded = decodeBase64(input._auth);
      const [username, password] = trySplitAtFirstOccurrenceOf(decoded, ":");
      if (password === null)
        throw new Error("Auth Base64 string was not in the user:pass format.");
      return removeExplicitUndefined({
        username,
        password,
        email: input.email,
        alwaysAuth: input.alwaysAuth,
      });
    }

    return removeExplicitUndefined({
      token: input.token,
      alwaysAuth: input.alwaysAuth,
    });
  }

  let cachedConfig: UpmConfigContent | null = null;

  return async (systemUser, url) => {
    // We know there is no auth required for these registries
    if (url === openupmRegistryUrl || url === unityRegistryUrl)
      return { url, auth: null };

    // Only load config if we have dont have it in the cache
    if (cachedConfig === null) {
      const configPath = await getUpmConfigPath(systemUser);
      cachedConfig = await loadUpmConfig(configPath);
      if (cachedConfig === null) {
        debugLog(
          `No .upmconfig.toml file found. Will use no auth for registry "${url}".`
        );
        return { url, auth: null };
      }
    }

    const entry =
      cachedConfig.npmAuth?.[url] ?? cachedConfig?.npmAuth?.[url + "/"] ?? null;
    if (entry === null) {
      debugLog(
        `.upmconfig.toml had no entry for registry "${url}". Will not use auth for that registry.`
      );
      return { url, auth: null };
    }

    const auth = importNpmAuth(entry);
    return { url, auth };
  };
}

/**
 * Default {@link GetRegistryAuth} function. Uses {@link LoadRegistryAuthFromUpmConfig}.
 */
export const getRegistryAuth = LoadRegistryAuthFromUpmConfig(
  getUpmConfigPath,
  loadUpmConfig,
  npmDebugLog
);
