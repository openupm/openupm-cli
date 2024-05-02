import { Registry } from "../domain/registry";
import { AsyncResult, Err, Ok } from "ts-results-es";
import npmFetch from "npm-registry-fetch";
import { assertIsHttpError } from "../utils/error-type-guards";
import { getNpmFetchOptions, SearchedPackument } from "./search-registry";
import { DomainName } from "../domain/domain-name";
import { HttpErrorBase } from "npm-registry-fetch/lib/errors";

/**
 * The result of querying the /-/all endpoint.
 */
export type AllPackumentsResult = Readonly<{
  _updated: number;
  [name: DomainName]: SearchedPackument;
}>;

/**
 * Service for getting all packuments from a registry.
 * @param registry The registry to get packuments for.
 */
export type GetAllPackumentsService = (
  registry: Registry
) => AsyncResult<AllPackumentsResult, HttpErrorBase>;

/**
 * Makes a {@link GetAllPackumentsService} service.
 */
export function makeGetAllPackumentsService(): GetAllPackumentsService {
  return (registry) => {
    return new AsyncResult(
      npmFetch
        .json("/-/all", getNpmFetchOptions(registry))
        .then((result) => Ok(result as AllPackumentsResult))
        .catch((error) => {
          assertIsHttpError(error);
          return Err(error);
        })
    );
  };
}
