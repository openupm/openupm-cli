import { Registry } from "../npm-client";
import { AsyncResult, Err, Ok } from "ts-results-es";
import npmFetch, { HttpErrorBase } from "npm-registry-fetch";
import npmSearch from "libnpmsearch";
import { assertIsHttpError } from "../utils/error-type-guards";
import log from "../cli/logger";
import { UnityPackument } from "../domain/packument";
import { SemanticVersion } from "../domain/semantic-version";
import { DomainName } from "../domain/domain-name";

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
 * The result of querying the /-/all endpoint.
 */
export type AllPackumentsResult = Readonly<{
  _updated: number;
  [name: DomainName]: SearchedPackument;
}>;

/**
 * Service for searching packuments on a npm-registry.
 */
export type SearchService = {
  /**
   * Attempts to search a npm registry.
   * @param registry The registry to search.
   * @param keyword The keyword to search.
   */
  trySearch(
    registry: Registry,
    keyword: string
  ): AsyncResult<SearchedPackument[], HttpErrorBase>;

  /**
   * Attempts to query the /-/all endpoint.
   * @param registry The registry to query.
   */
  tryGetAll(
    registry: Registry
  ): AsyncResult<AllPackumentsResult, HttpErrorBase>;
};

/**
 * Get npm fetch options.
 * @param registry The registry for which to get the options.
 */
const getNpmFetchOptions = function (registry: Registry): npmSearch.Options {
  const opts: npmSearch.Options = {
    log,
    registry: registry.url,
  };
  const auth = registry.auth;
  if (auth !== null) Object.assign(opts, auth);
  return opts;
};

/**
 * Makes a new {@link SearchService}.
 */
export function makeSearchService(): SearchService {
  return {
    trySearch(registry, keyword) {
      return new AsyncResult(
        npmSearch(keyword, getNpmFetchOptions(registry))
          // NOTE: The results of the search will be Packument objects so we can change the type
          .then((results) => Ok(results as SearchedPackument[]))
          .catch((error) => {
            assertIsHttpError(error);
            return Err(error);
          })
      );
    },

    tryGetAll(registry) {
      return new AsyncResult(
        npmFetch
          .json("/-/all", getNpmFetchOptions(registry))
          .then((result) => Ok(result as AllPackumentsResult))
          .catch((error) => {
            assertIsHttpError(error);
            return Err(error);
          })
      );
    },
  };
}
