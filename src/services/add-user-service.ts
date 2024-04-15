import RegClient, { NpmAuth } from "another-npm-registry-client";
import log from "../cli/logger";
import { RegistryUrl } from "../domain/registry-url";
import { CustomError } from "ts-custom-error";
import { AsyncResult, Err, Ok } from "ts-results-es";

/**
 * Error for when authentication failed.
 */
export class AuthenticationError extends CustomError {
  private readonly _class = "AuthenticationError";
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
 * Service for adding users to a npm-registry.
 */
export interface AddUserService {
  /**
   * Attempts to add a user to a registry.
   * @param registryUrl The url of the registry into which to login.
   * @param username The username with which to login.
   * @param email The email with which to login.
   * @param password The password with which to login.
   * @returns An authentication token or null if registration failed.
   */
  tryAdd(
    registryUrl: RegistryUrl,
    username: string,
    email: string,
    password: string
  ): AsyncResult<AuthenticationToken, AuthenticationError>;
}

export type Registry = Readonly<{
  url: RegistryUrl;
  auth: NpmAuth | null;
}>;

/**
 * Makes a new {@link AddUserService}.
 */
export function makeAddUserService(): AddUserService {
  const registryClient = new RegClient({ log });
  return {
    tryAdd(registryUrl, username, email, password) {
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
  };
}
