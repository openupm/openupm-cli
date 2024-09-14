import type RegClient from "another-npm-registry-client";
import type { AddUserResponse } from "another-npm-registry-client";
import npmSearch from "libnpmsearch";
import npmFetch from "npm-registry-fetch";
import { DomainName } from "../domain/domain-name";
import { assertIsError, assertIsHttpError } from "../domain/error-type-guards";
import { DebugLog } from "../domain/logging";
import type { UnityPackument } from "../domain/packument";
import { makeNpmFetchOptions, Registry } from "../domain/registry";
import type { RegistryUrl } from "../domain/registry-url";
import type { SemanticVersion } from "../domain/semantic-version";
import {
  makeRegistryInteractionError,
  RegistryAuthenticationError,
} from "./common-errors";

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

/**
 * A token authenticating a user.
 */
type AuthToken = string;

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
export function getAuthTokenUsing(
  registryClient: RegClient.Instance,
  debugLog: DebugLog
): GetAuthToken {
  return (registryUrl, username, email, password) =>
    new Promise<[AddUserResponse, Response]>((resolve, reject) => {
      registryClient.adduser(
        registryUrl,
        { auth: { username, email, password } },
        (error, responseData, _, response) => {
          if (error !== null) reject(error);
          else resolve([responseData, response]);
        }
      );
    }).then(async ([data, response]) => {
      if (!data.ok) {
        await debugLog(
          "Npm registry login failed because of not-ok response.",
          response
        );
        throw new RegistryAuthenticationError(registryUrl);
      }
      return data.token;
    });
}

/**
 * A type representing a searched packument. Instead of having all versions
 * this type only includes the latest version.
 */
export type SearchedPackument = Readonly<
  Omit<UnityPackument, "versions"> & {
    versions: Readonly<Record<SemanticVersion, "latest">>;
  }
>;

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
