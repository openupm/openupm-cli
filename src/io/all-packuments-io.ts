import { Registry } from "../domain/registry";
import { AsyncResult, Err, Ok } from "ts-results-es";
import npmFetch from "npm-registry-fetch";
import { assertIsHttpError } from "../utils/error-type-guards";
import { getNpmFetchOptions, SearchedPackument } from "./npm-search";
import { DomainName } from "../domain/domain-name";
import {
  GenericNetworkError,
  RegistryAuthenticationError,
} from "./common-errors";
import { DebugLog } from "../logging";

/**
 * The result of querying the /-/all endpoint.
 */
export type AllPackuments = Readonly<{
  _updated: number;
  [name: DomainName]: SearchedPackument;
}>;

/**
 * Error for when the request to get all packuments failed.
 */
export type FetchAllPackumentsError =
  | GenericNetworkError
  | RegistryAuthenticationError;

/**
 * Function for getting fetching packuments from a npm registry.
 * @param registry The registry to get packuments for.
 */
export type FetchAllPackuments = (
  registry: Registry
) => AsyncResult<AllPackuments, FetchAllPackumentsError>;

/**
 * Makes a {@link FetchAllPackuments} function.
 */
export function makeAllPackumentsFetcher(
  debugLog: DebugLog
): FetchAllPackuments {
  return (registry) => {
    return new AsyncResult(
      npmFetch
        .json("/-/all", getNpmFetchOptions(registry))
        .then((result) => Ok(result as AllPackuments))
        .catch((error) => {
          assertIsHttpError(error);
          debugLog("A http request failed.", error);
          return Err(
            error.statusCode === 401
              ? new RegistryAuthenticationError()
              : new GenericNetworkError()
          );
        })
    );
  };
}
