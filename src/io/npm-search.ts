import npmFetch from "npm-registry-fetch";
import npmSearch from "libnpmsearch";
import { assertIsHttpError } from "../utils/error-type-guards";
import { UnityPackument } from "../domain/packument";
import { SemanticVersion } from "../domain/semantic-version";
import { Registry } from "../domain/registry";
import { RegistryAuthenticationError } from "./common-errors";
import { DebugLog } from "../logging";

/**
 * A type representing a searched packument. Instead of having all versions
 * this type only includes the latest version.
 */
export type SearchedPackument = Readonly<
  Omit<UnityPackument, "versions"> & {
    versions: Readonly<Record<SemanticVersion, "latest">>;
  }
>;

/**
 * Function for searching packuments on a registry.
 * @param registry The registry to search.
 * @param keyword The keyword to search.
 * @returns The search results.
 */
export type SearchRegistry = (
  registry: Registry,
  keyword: string
) => Promise<ReadonlyArray<SearchedPackument>>;

/**
 * Get npm fetch options.
 */
export const getNpmFetchOptions = function (
  registry: Registry
): npmFetch.Options {
  const opts: npmSearch.Options = {
    registry: registry.url,
  };
  const auth = registry.auth;
  if (auth !== null) Object.assign(opts, auth);
  return opts;
};

/**
 * Makes a {@link SearchRegistry} function.
 */
export function makeSearchRegistry(debugLog: DebugLog): SearchRegistry {
  return (registry, keyword) =>
    npmSearch(keyword, getNpmFetchOptions(registry))
      // NOTE: The results of the search will be packument objects, so we can change the type
      .then((results) => results as SearchedPackument[])
      .catch((error) => {
        assertIsHttpError(error);
        debugLog("A http request failed.", error);
        throw error.statusCode === 401
          ? new RegistryAuthenticationError(registry.url)
          : error;
      });
}
