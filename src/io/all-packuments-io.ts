import npmFetch from "npm-registry-fetch";
import { DomainName } from "../domain/domain-name";
import { Registry } from "../domain/registry";
import { DebugLog, npmDebugLog } from "../logging";
import { assertIsError, isHttpError } from "../utils/error-type-guards";
import { RegistryAuthenticationError } from "./common-errors";
import { getNpmFetchOptions, SearchedPackument } from "./npm-search";

/**
 * The result of querying the /-/all endpoint.
 */
export type AllPackuments = Readonly<{
  // eslint-disable-next-line jsdoc/require-jsdoc
  _updated: number;
  [name: DomainName]: SearchedPackument;
}>;

/**
 * Function for getting all packuments from a npm registry.
 * @param registry The registry to get packuments for.
 */
export type GetAllRegistryPackuments = (registry: Registry) => Promise<AllPackuments>;

/**
 * Makes a {@link GetAllRegistryPackuments} function.
 */
export function FetchAllRegistryPackuments(debugLog: DebugLog): GetAllRegistryPackuments {
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

/**
 * Default {@link GetAllRegistryPackuments} function. Uses {@link FetchAllRegistryPackuments}.
 */
export const getAllRegistryPackuments = FetchAllRegistryPackuments(npmDebugLog)