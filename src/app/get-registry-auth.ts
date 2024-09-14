import { NpmAuth } from "another-npm-registry-client";
import { decodeBase64 } from "../domain/base64";
import { partialApply } from "../domain/fp-utils";
import { DebugLog } from "../domain/logging";
import { Registry } from "../domain/registry";
import {
  openupmRegistryUrl,
  RegistryUrl,
  unityRegistryUrl,
} from "../domain/registry-url";
import { trySplitAtFirstOccurrenceOf } from "../domain/string-utils";
import type { UpmConfig, UpmConfigEntry } from "../domain/upm-config";
import { removeExplicitUndefined } from "../domain/zod-utils";
import { type ReadTextFile } from "../io/fs";
import { loadUpmConfigUsing } from "./get-upm-config";

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
 * @param entry The input auth object to convert.
 * @returns The converted auth object.
 * @throws {Error} If auth contained bad base64 string.
 */
export function importNpmAuth(entry: UpmConfigEntry): NpmAuth {
  // Basic auth
  if ("_auth" in entry) {
    const decoded = decodeBase64(entry._auth);
    const [username, password] = trySplitAtFirstOccurrenceOf(decoded, ":");
    if (password === null)
      throw new Error("Auth Base64 string was not in the user:pass format.");
    return removeExplicitUndefined({
      username,
      password,
      email: entry.email,
      alwaysAuth: entry.alwaysAuth,
    });
  }

  return removeExplicitUndefined({
    token: entry.token,
    alwaysAuth: entry.alwaysAuth,
  });
}

/**
 * Attempts to find and import an auth entry from a {@link UpmConfigContent} object.
 * @param upmConfig The upm-config content.
 * @param url The url.
 * @returns The imported auth object or null if not found.
 */
export function tryGetAuthEntry(
  upmConfig: UpmConfig,
  url: RegistryUrl
): NpmAuth | null {
  const entry =
    upmConfig.npmAuth?.[url] ?? upmConfig.npmAuth?.[url + "/"] ?? null;
  if (entry === null) {
    return null;
  }

  return importNpmAuth(entry);
}

/**
 * Gets registry authentication.
 * @param readTextFile IO function for reading text files.
 * @param debugLog Logging function for debug messages.
 * @param configPath The path of the upm-config file.
 * @param url The url for which to get authentication.
 */
export async function loadRegistryAuthUsing(
  readTextFile: ReadTextFile,
  debugLog: DebugLog,
  configPath: string,
  url: RegistryUrl
): Promise<Registry> {
  const loadUpmConfig = partialApply(loadUpmConfigUsing, readTextFile);

  let cachedConfig: UpmConfig | null = null;

  if (isNonAuthUrl(url)) return { url, auth: null };

  // Only load config if we have dont have it in the cache
  if (cachedConfig === null) {
    cachedConfig = await loadUpmConfig(configPath);
    if (cachedConfig === null) {
      await debugLog(
        `No .upmconfig.toml file found. Will use no auth for registry "${url}".`
      );
      return { url, auth: null };
    }
  }

  const auth = tryGetAuthEntry(cachedConfig, url);
  if (auth === null)
    await debugLog(
      `.upmconfig.toml had no entry for registry "${url}". Will not use auth for that registry.`
    );

  return { url, auth };
}
