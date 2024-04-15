import RegClient from "another-npm-registry-client";
import log from "../cli/logger";
import { AsyncResult, Err, Ok } from "ts-results-es";
import { assertIsHttpError } from "../utils/error-type-guards";
import { UnityPackument } from "../domain/packument";
import { HttpErrorBase } from "npm-registry-fetch";
import { DomainName } from "../domain/domain-name";
import { Registry } from "./add-user-service";

/**
 * Service for fetching packuments from a npm-registry.
 */
export type PackumentFetchService = {
  /**
   * Attempts to fetch a packument.
   * @param registry The registry to fetch from.
   * @param name The name of the packument to fetch.
   */
  tryFetchByName(
    registry: Registry,
    name: DomainName
  ): AsyncResult<UnityPackument | null, HttpErrorBase>;
};

/**
 * Makes a {@link PackumentFetchService} service.
 */
export function makePackumentFetchService(): PackumentFetchService {
  const registryClient = new RegClient({ log });

  return {
    tryFetchByName(registry, name) {
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
    },
  };
}
