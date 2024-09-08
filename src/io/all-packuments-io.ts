import npmFetch from "npm-registry-fetch";
import { DomainName } from "../domain/domain-name";
import { makeNpmFetchOptions, Registry } from "../domain/registry";
import { DebugLog } from "../domain/logging";
import { assertIsError } from "../domain/error-type-guards";
import { makeRegistryInteractionError } from "./common-errors";
import { SearchedPackument } from "./npm-search";

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
export type GetAllRegistryPackuments = (
  registry: Registry
) => Promise<AllPackuments>;

/**
 * Makes a {@link GetAllRegistryPackuments} function.
 */
export function getAllRegistryPackumentsUsing(
  debugLog: DebugLog
): GetAllRegistryPackuments {
  return async (registry) => {
    await debugLog(`Getting all packages from ${registry.url}.`);
    try {
      const result = await npmFetch.json(
        "/-/all",
        makeNpmFetchOptions(registry)
      );
      return result as AllPackuments;
    } catch (error) {
      assertIsError(error);
      await debugLog(`Failed to get all packages from ${registry.url}.`, error);

      throw makeRegistryInteractionError(error, registry.url);
    }
  };
}
