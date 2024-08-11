import npmSearch from "libnpmsearch";
import npmFetch from "npm-registry-fetch";
import { UnityPackument } from "../domain/packument";
import { Registry } from "../domain/registry";
import { SemanticVersion } from "../domain/semantic-version";
import { DebugLog, npmDebugLog } from "../logging";
import { assertIsHttpError } from "../utils/error-type-guards";
import { RegistryAuthenticationError } from "./common-errors";

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
 * Function for searching packuments on a npm registry.
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
 * Makes a {@link SearchRegistry} function which uses the npm search api to
 * find packages in a remote registry.
 */
export function NpmApiSearch(debugLog: DebugLog): SearchRegistry {
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

/**
 * Default {@link SearchRegistry} function. Uses {@link NpmApiSearch}.
 */
export const searchRegistry = NpmApiSearch(npmDebugLog);
