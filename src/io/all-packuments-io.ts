import { Registry } from "../domain/registry";
import { AsyncResult, Err, Ok } from "ts-results-es";
import npmFetch from "npm-registry-fetch";
import { assertIsHttpError } from "../utils/error-type-guards";
import {
  getNpmFetchOptions,
  SearchedPackument,
} from "./npm-search";
import { DomainName } from "../domain/domain-name";
import { HttpErrorBase } from "npm-registry-fetch/lib/errors";

/**
 * The result of querying the /-/all endpoint.
 */
export type AllPackumentsR = Readonly<{
  _updated: number;
  [name: DomainName]: SearchedPackument;
}>;

/**
 * Function for getting fetching packuments from a npm registry.
 * @param registry The registry to get packuments for.
 */
export type FetchAllPackuments = (
  registry: Registry
) => AsyncResult<AllPackumentsR, HttpErrorBase>;

/**
 * Makes a {@link FetchAllPackuments} function.
 */
export function makeAllPackumentsFetcher(): FetchAllPackuments {
  return (registry) => {
    return new AsyncResult(
      npmFetch
        .json("/-/all", getNpmFetchOptions(registry))
        .then((result) => Ok(result as AllPackumentsR))
        .catch((error) => {
          assertIsHttpError(error);
          return Err(error);
        })
    );
  };
}
