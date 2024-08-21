import RegClient from "another-npm-registry-client";
import { DomainName } from "../domain/domain-name";
import { UnityPackument } from "../domain/packument";
import { Registry } from "../domain/registry";
import { DebugLog, npmDebugLog } from "../logging";
import { assertIsHttpError } from "../utils/error-type-guards";
import { makeRegistryInteractionError } from "./common-errors";

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
            else reject(makeRegistryInteractionError(error, registry.url));
          } else resolve(packument);
        }
      );
    });
  };
}

/**
 * Default {@link GetRegistryPackument} function. Uses {@link FetchRegistryPackument}.
 */
export const getRegistryPackument = (registryClient: RegClient.Instance) =>
  FetchRegistryPackument(registryClient, npmDebugLog);
