import { NpmAuth } from "another-npm-registry-client";
import { decodeBase64 } from "../domain/base64";
import { Registry } from "../domain/registry";
import {
  openupmRegistryUrl,
  RegistryUrl,
  unityRegistryUrl,
} from "../domain/registry-url";
import {
  loadUpmConfig,
  LoadUpmConfig,
  UpmAuth,
  UpmConfigContent,
} from "../io/upm-config-io";
import { DebugLog } from "../logging";
import { trySplitAtFirstOccurrenceOf } from "../utils/string-utils";
import { removeExplicitUndefined } from "../utils/zod-utils";

/**
 * Service function for getting registry authentication.
 * @param configPath The path of the upm-config file.
 * @param url The url for which to get authentication.
 */
export type GetRegistryAuth = (
  configPath: string,
  url: RegistryUrl
) => Promise<Registry>;

/**
 * Checks whether a registry requires authentication. This just checks whether
 * the url is for the Unity or OpenUPM registry.
 * @param url The url to check.
 * @returns Whether the url is known to not require authentication.
 */
export function isNonAuthUrl(url: RegistryUrl): boolean {
  // We know there is no auth required for these registries
  return url === openupmRegistryUrl || url === unityRegistryUrl;
}

/**
 * Converts a {@link UpmAuth} object to an {@link NpmAuth} object.
 * @param auth The input auth object to convert.
 * @returns The converted auth object.
 * @throws {Error} If auth contained bad base64 string.
 */
export function importNpmAuth(auth: UpmAuth): NpmAuth {
  // Basic auth
  if ("_auth" in auth) {
    const decoded = decodeBase64(auth._auth);
    const [username, password] = trySplitAtFirstOccurrenceOf(decoded, ":");
    if (password === null)
      throw new Error("Auth Base64 string was not in the user:pass format.");
    return removeExplicitUndefined({
      username,
      password,
      email: auth.email,
      alwaysAuth: auth.alwaysAuth,
    });
  }

  return removeExplicitUndefined({
    token: auth.token,
    alwaysAuth: auth.alwaysAuth,
  });
}

/**
 * Makes a {@link GetRegistryAuth} function which gets it's information from
 * the users upm config.
 */
export function LoadRegistryAuthFromUpmConfig(
  loadUpmConfig: LoadUpmConfig,
  debugLog: DebugLog
): GetRegistryAuth {
  let cachedConfig: UpmConfigContent | null = null;

  return async (configPath, url) => {
    if (isNonAuthUrl(url)) return { url, auth: null };

    // Only load config if we have dont have it in the cache
    if (cachedConfig === null) {
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
export const getRegistryAuthUsing = (debugLog: DebugLog) =>
  LoadRegistryAuthFromUpmConfig(loadUpmConfig, debugLog);
