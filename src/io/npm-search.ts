import npmSearch from "libnpmsearch";
import { UnityPackument } from "../domain/packument";
import { makeNpmFetchOptions, Registry } from "../domain/registry";
import { SemanticVersion } from "../domain/semantic-version";
import { DebugLog } from "../domain/logging";
import { assertIsError } from "../domain/error-type-guards";
import { makeRegistryInteractionError } from "./common-errors";

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
 * Makes a {@link SearchRegistry} function which uses the npm search api to
 * find packages in a remote registry.
 */
export function searchRegistryUsing(debugLog: DebugLog): SearchRegistry {
  return (registry, keyword) =>
    npmSearch(keyword, makeNpmFetchOptions(registry))
      // NOTE: The results of the search will be packument objects, so we can change the type
      .then((results) => results as SearchedPackument[])
      .catch(async (error) => {
        assertIsError(error);
        await debugLog("A http request failed.", error);
        throw makeRegistryInteractionError(error, registry.url);
      });
}
