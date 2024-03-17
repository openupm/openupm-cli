import RegClient, { NpmAuth } from "another-npm-registry-client";
import log from "./logger";
import { UnityPackument } from "./types/packument";
import { DomainName } from "./types/domain-name";
import { SemanticVersion } from "./types/semantic-version";
import { RegistryUrl } from "./types/registry-url";
import npmSearch from "libnpmsearch";
import { assertIsHttpError } from "./utils/error-type-guards";
import npmFetch, { HttpErrorBase } from "npm-registry-fetch";
import { CustomError } from "ts-custom-error";
import { AsyncResult, Err, Ok, Result } from "ts-results-es";

/**
 * Error for when authentication failed.
 */
export class AuthenticationError extends CustomError {
  constructor(
    /**
     * The http-response code returned by the server.
     */
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/**
 * A token authenticating a user.
 */
type AuthenticationToken = string;

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
 * The result of querying the /-/all endpoint.
 */
type AllPackumentsResult = Readonly<{
  _updated: number;
  [name: DomainName]: SearchedPackument;
}>;

/**
 * Abstraction over a regular npm client which is specialized for UPM purposes.
 */
export interface NpmClient {
  /**
   * Attempts to get a packument from a registry.
   * @param registry The registry to get the packument from.
   * @param name The name of the packument to get.
   */
  tryFetchPackument(
    registry: Registry,
    name: DomainName
  ): AsyncResult<UnityPackument | null, HttpErrorBase>;

  /**
   * Attempts to add a user to a registry.
   * @param registryUrl The url of the registry into which to login.
   * @param username The username with which to login.
   * @param email The email with which to login.
   * @param password The password with which to login.
   * @returns An authentication token or null if registration failed.
   */
  addUser(
    registryUrl: RegistryUrl,
    username: string,
    email: string,
    password: string
  ): AsyncResult<AuthenticationToken, AuthenticationError>;

  /**
   * Attempts to search a npm registry.
   * @param registry The registry to search.
   * @param keyword The keyword to search.
   */
  trySearch(
    registry: Registry,
    keyword: string
  ): Promise<Result<SearchedPackument[], HttpErrorBase>>;

  /**
   * Attempts to query the /-/all endpoint.
   * @param registry The registry to query.
   */
  tryGetAll(
    registry: Registry
  ): Promise<Result<AllPackumentsResult, HttpErrorBase>>;
}

export type Registry = Readonly<{
  url: RegistryUrl;
  auth: NpmAuth | null;
}>;

/**
 * Get npm fetch options.
 * @param registry The registry for which to get the options.
 */
const getNpmFetchOptions = function (registry: Registry): npmSearch.Options {
  const opts: npmSearch.Options = {
    log,
    registry: registry.url,
  };
  const auth = registry.auth;
  if (auth !== null) Object.assign(opts, auth);
  return opts;
};

/**
 * Makes a new {@link NpmClient}.
 */
export const makeNpmClient = (): NpmClient => {
  // create client
  const registryClient = new RegClient({ log });
  return {
    tryFetchPackument(registry, name) {
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

    addUser(registryUrl, username, email, password) {
      return new AsyncResult(
        new Promise((resolve) => {
          registryClient.adduser(
            registryUrl,
            { auth: { username, email, password } },
            (error, responseData, _, response) => {
              if (error !== null || !responseData.ok)
                resolve(
                  Err(
                    new AuthenticationError(
                      response.statusCode,
                      response.statusMessage
                    )
                  )
                );
              else resolve(Ok(responseData.token));
            }
          );
        })
      );
    },

    async trySearch(registry, keyword) {
      try {
        // NOTE: The results of the search will be Packument objects so we can change the type
        const packuments = (await npmSearch(
          keyword,
          getNpmFetchOptions(registry)
        )) as SearchedPackument[];
        return Ok(packuments);
      } catch (error) {
        assertIsHttpError(error);
        return Err(error);
      }
    },

    async tryGetAll(registry) {
      try {
        const result = (await npmFetch.json(
          "/-/all",
          getNpmFetchOptions(registry)
        )) as AllPackumentsResult;
        return Ok(result);
      } catch (error) {
        assertIsHttpError(error);
        return Err(error);
      }
    },
  };
};
