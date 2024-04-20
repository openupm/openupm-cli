import { AsyncResult, Err, Ok } from "ts-results-es";
import npmFetch, { HttpErrorBase } from "npm-registry-fetch";
import npmSearch from "libnpmsearch";
import { assertIsHttpError } from "../utils/error-type-guards";
import log from "../cli/logger";
import { UnityPackument } from "../domain/packument";
import { SemanticVersion } from "../domain/semantic-version";
import { Registry } from "../domain/registry";

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
 * Service function for searching packuments on a registry.
 * @param registry The registry to search.
 * @param keyword The keyword to search.
 */
export type SearchRegistryService = (
  registry: Registry,
  keyword: string
) => AsyncResult<ReadonlyArray<SearchedPackument>, HttpErrorBase>;

/**
 * Get npm fetch options.
 * @param registry The registry for which to get the options.
 */
export const getNpmFetchOptions = function (
  registry: Registry
): npmFetch.Options {
  const opts: npmSearch.Options = {
    log,
    registry: registry.url,
  };
  const auth = registry.auth;
  if (auth !== null) Object.assign(opts, auth);
  return opts;
};

/**
 * Makes a {@link SearchRegistryService} function.
 */
export function makeSearchRegistryService(): SearchRegistryService {
  return (registry, keyword) => {
    return new AsyncResult(
      npmSearch(keyword, getNpmFetchOptions(registry))
        // NOTE: The results of the search will be packument objects, so we can change the type
        .then((results) => Ok(results as SearchedPackument[]))
        .catch((error) => {
          assertIsHttpError(error);
          return Err(error);
        })
    );
  };
}
