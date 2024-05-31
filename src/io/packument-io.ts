import RegClient from "another-npm-registry-client";
import { AsyncResult, Err, Ok } from "ts-results-es";
import { assertIsHttpError } from "../utils/error-type-guards";
import { Registry } from "../domain/registry";
import { DomainName } from "../domain/domain-name";
import { UnityPackument } from "../domain/packument";
import {
  GenericNetworkError,
  RegistryAuthenticationError,
} from "./common-errors";

/**
 * Error which may occur when fetching a packument from a remote registry.
 */
export type FetchPackumentError =
  | GenericNetworkError
  | RegistryAuthenticationError;
/**
 * Function for fetching a packument from a registry.
 * @param registry The registry to fetch from.
 * @param name The name of the packument to fetch.
 * @returns The packument or null of not found.
 */

export type FetchPackument = (
  registry: Registry,
  name: DomainName
) => AsyncResult<UnityPackument | null, FetchPackumentError>;

/**
 * Makes a {@link FetchPackument} function.
 */
export function makeFetchPackument(
  registryClient: RegClient.Instance
): FetchPackument {
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
              else
                resolve(
                  Err(
                    error.statusCode === 401
                      ? new RegistryAuthenticationError()
                      : new GenericNetworkError()
                  )
                );
            } else resolve(Ok(packument));
          }
        );
      })
    );
  };
}
