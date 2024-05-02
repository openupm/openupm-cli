import RegClient from "another-npm-registry-client";
import { AsyncResult, Err, Ok } from "ts-results-es";
import { assertIsHttpError } from "../utils/error-type-guards";
import { UnityPackument } from "../domain/packument";
import { HttpErrorBase } from "npm-registry-fetch/lib/errors";
import { DomainName } from "../domain/domain-name";
import { Registry } from "../domain/registry";

/**
 * Error which may occur when fetching a packument from a remote registry.
 */
export type FetchPackumentError = HttpErrorBase;

/**
 * Service function for fetching a packument from a registry.
 * @param registry The registry to fetch from.
 * @param name The name of the packument to fetch.
 */

export type FetchPackumentService = (
  registry: Registry,
  name: DomainName
) => AsyncResult<UnityPackument | null, FetchPackumentError>;

/**
 * Makes a {@link FetchPackumentService} function.
 */
export function makeFetchPackumentService(
  registryClient: RegClient.Instance
): FetchPackumentService {
  return (registry, name) => {
    const url = `${registry.url}/${name}`;
    return new AsyncResult(
      new Promise((resolve) => {
        return registryClient.get(
          url,
          { auth: registry.auth || undefined },
          (error, packument) => {
            if (error !== null) {
              assertIsHttpError(error);
              if (error.statusCode === 404) resolve(Ok(null));
              else resolve(Err(error));
            } else resolve(Ok(packument));
          }
        );
      })
    );
  };
}
