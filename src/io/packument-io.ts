import RegClient from "another-npm-registry-client";
import { assertIsHttpError } from "../utils/error-type-guards";
import { Registry } from "../domain/registry";
import { DomainName } from "../domain/domain-name";
import { UnityPackument } from "../domain/packument";
import { RegistryAuthenticationError } from "./common-errors";
import { DebugLog, npmDebugLog } from "../logging";
import { npmRegistryClient } from "./reg-client";

/**
 * Function for getting a packument from a registry.
 * @param registry The registry to get the packument from.
 * @param name The name of the packument.
 * @returns The packument or null of not found.
 */
export type GetRegistryPackument = (
  registry: Registry,
  name: DomainName
) => Promise<UnityPackument | null>;

/**
 * Makes a {@link GetRegistryPackument} function which fetches the packument
 * from a remote npm registry.
 */
export function FetchRegistryPackument(
  registryClient: RegClient.Instance,
  debugLog: DebugLog
): GetRegistryPackument {
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

/**
 * Default {@link GetRegistryPackument} function. Uses {@link FetchRegistryPackument}.
 */
export const getRegistryPackument = FetchRegistryPackument(
  npmRegistryClient,
  npmDebugLog
);
