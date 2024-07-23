import { Registry } from "../domain/registry";
import npmFetch from "npm-registry-fetch";
import { assertIsError, isHttpError } from "../utils/error-type-guards";
import { getNpmFetchOptions, SearchedPackument } from "./npm-search";
import { DomainName } from "../domain/domain-name";
import { RegistryAuthenticationError } from "./common-errors";
import { DebugLog } from "../logging";

/**
 * The result of querying the /-/all endpoint.
 */
export type AllPackuments = Readonly<{
  // eslint-disable-next-line jsdoc/require-jsdoc
  _updated: number;
  [name: DomainName]: SearchedPackument;
}>;

/**
 * Function for getting fetching packuments from a npm registry.
 * @param registry The registry to get packuments for.
 */
export type FetchAllPackuments = (registry: Registry) => Promise<AllPackuments>;

/**
 * Makes a {@link FetchAllPackuments} function.
 */
export function makeFetchAllPackuments(debugLog: DebugLog): FetchAllPackuments {
  return async (registry) => {
    debugLog(`Getting all packages from ${registry.url}.`);
    try {
      const result = await npmFetch.json(
        "/-/all",
        getNpmFetchOptions(registry)
      );
      return result as AllPackuments;
    } catch (error) {
      assertIsError(error);
      debugLog(`Failed to get all packages from ${registry.url}.`, error);

      if (isHttpError(error))
        throw error.statusCode === 401
          ? new RegistryAuthenticationError(registry.url)
          : error;
      throw error;
    }
  };
}
