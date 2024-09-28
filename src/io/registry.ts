import type RegClient from "another-npm-registry-client";
import npmSearch from "libnpmsearch";
import { loginCouch } from "npm-profile";
import npmFetch from "npm-registry-fetch";
import type { AuthToken } from "../domain/auth";
import { DomainName } from "../domain/domain-name";
import { assertIsError, assertIsHttpError } from "../domain/error-type-guards";
import { DebugLog } from "../domain/logging";
import type { SearchedPackument, UnityPackument } from "../domain/packument";
import { makeNpmFetchOptions, Registry } from "../domain/registry";
import type { RegistryUrl } from "../domain/registry-url";
import {
  makeRegistryInteractionError,
  RegistryAuthenticationError,
} from "./common-errors";

type AllPackuments = Readonly<{
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
) => Promise<ReadonlyArray<SearchedPackument>>;

/**
 * Makes a {@link GetAllRegistryPackuments} function.
 */
export function getAllRegistryPackumentsUsing(
  debugLog: DebugLog
): GetAllRegistryPackuments {
  return async (registry) => {
    await debugLog(`Getting all packages from ${registry.url}.`);
    try {
      const allPackuments = (await npmFetch.json(
        "/-/all",
        makeNpmFetchOptions(registry)
      )) as AllPackuments;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _updated, ...packumentEntries } = allPackuments;
      return Object.values(packumentEntries);
    } catch (error) {
      assertIsError(error);
      await debugLog(`Failed to get all packages from ${registry.url}.`, error);
      throw makeRegistryInteractionError(error, registry.url);
    }
  };
}

/**
 * Function for getting the authentication token for a npm reigstry.
 * @param registryUrl The url of the registry for which to get the token.
 * @param username The username for which to get the token.
 * @param email The email with which to get the token.
 * @param password The password for witch to get the token.
 * @returns The authentication token.
 */
export type GetAuthToken = (
  registryUrl: RegistryUrl,
  username: string,
  email: string,
  password: string
) => Promise<AuthToken>;

/**
 * Makes a {@link GetAuthToken} function which gets the token
 * by authenticating the user with a remote npm registry.
 */
export function getAuthTokenUsing(debugLog: DebugLog): GetAuthToken {
  return async (registryUrl, username, email, password) => {
    try {
      const result = await loginCouch(username, email, password, {
        registry: registryUrl,
      });
      return result.token;
    } catch (error) {
      assertIsError(error);
      await debugLog("Npm registry login failed.", error);
      throw new RegistryAuthenticationError(registryUrl);
    }
  };
}

/**
 * Function for searching packuments on a npm registry.
 * @param registry The registry to search.
 * @param keyword The keyword to search.
 * @returns The search results.
 */
export type SearchRegistry = (
  registry: Registry,
  keyword: string
) => Promise<ReadonlyArray<SearchedPackument>>;

/**
 * Makes a {@link SearchRegistry} function which uses the npm search api to
 * find packages in a remote registry.
 */
export function searchRegistryUsing(debugLog: DebugLog): SearchRegistry {
  return (registry, keyword) =>
    npmSearch(keyword, makeNpmFetchOptions(registry))
      // NOTE: The results of the search will be packument objects, so we can change the type
      .then((results) => results as SearchedPackument[])
      .catch(async (error) => {
        assertIsError(error);
        await debugLog("A http request failed.", error);
        throw makeRegistryInteractionError(error, registry.url);
      });
}

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
export function getRegistryPackumentUsing(
  registryClient: RegClient.Instance,
  debugLog: DebugLog
): GetRegistryPackument {
  return (registry, name) => {
    const url = `${registry.url}/${name}`;
    return new Promise<UnityPackument | null>((resolve, reject) => {
      return registryClient.get(
        url,
        { auth: registry.auth || undefined },
        (error, packument) => {
          if (error !== null) {
            assertIsHttpError(error);
            if (error.statusCode === 404) resolve(null);
            else reject(error);
          } else resolve(packument);
        }
      );
    }).catch(async (error) => {
      await debugLog("Fetching a packument failed.", error);
      throw makeRegistryInteractionError(error, registry.url);
    });
  };
}
