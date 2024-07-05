import RegClient from "another-npm-registry-client";
import { assertIsHttpError } from "../utils/error-type-guards";
import { Registry } from "../domain/registry";
import { DomainName } from "../domain/domain-name";
import { UnityPackument } from "../domain/packument";
import { RegistryAuthenticationError } from "./common-errors";
import { DebugLog } from "../logging";

/**
 * Function for fetching a packument from a registry.
 * @param registry The registry to fetch from.
 * @param name The name of the packument to fetch.
 * @returns The packument or null of not found.
 */
export type FetchPackument = (
  registry: Registry,
  name: DomainName
) => Promise<UnityPackument | null>;

/**
 * Makes a {@link FetchPackument} function.
 */
export function makeFetchPackument(
  registryClient: RegClient.Instance,
  debugLog: DebugLog
): FetchPackument {
  return (registry, name) => {
    const url = `${registry.url}/${name}`;
    return new Promise((resolve, reject) => {
      return registryClient.get(
        url,
        { auth: registry.auth || undefined },
        (error, packument) => {
          if (error !== null) {
            debugLog("Fetching a packument failed.", error);
            assertIsHttpError(error);
            if (error.statusCode === 404) resolve(null);
            else
              reject(
                error.statusCode === 401
                  ? new RegistryAuthenticationError(registry.url)
                  : error
              );
          } else resolve(packument);
        }
      );
    });
  };
}
