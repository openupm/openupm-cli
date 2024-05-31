import RegClient from "another-npm-registry-client";
import { RegistryUrl } from "../domain/registry-url";
import { AsyncResult, Err, Ok } from "ts-results-es";
import {
  GenericNetworkError,
  RegistryAuthenticationError,
} from "../io/common-errors";
import { DebugLog } from "../logging";

/**
 * Error which may occur when logging a user into a npm registry.
 */
export type NpmLoginError = GenericNetworkError | RegistryAuthenticationError;

/**
 * A token authenticating a user.
 */
type AuthenticationToken = string;

/**
 * Function for authenticating users with a npm registry.
 * @param registryUrl The url of the registry into which to login.
 * @param username The username with which to login.
 * @param email The email with which to login.
 * @param password The password with which to login.
 * @returns An authentication token or null if registration failed.
 */
export type NpmLogin = (
  registryUrl: RegistryUrl,
  username: string,
  email: string,
  password: string
) => AsyncResult<AuthenticationToken, NpmLoginError>;

/**
 * Makes a new {@link NpmLogin} function.
 */
export function makeNpmLogin(
  registryClient: RegClient.Instance,
  debugLog: DebugLog
): NpmLogin {
  return (registryUrl, username, email, password) => {
    return new AsyncResult(
      new Promise((resolve) => {
        registryClient.adduser(
          registryUrl,
          { auth: { username, email, password } },
          (error, responseData, _, response) => {
            if (response !== undefined && !responseData.ok) {
              debugLog("A http request failed.", response);
              resolve(
                Err(
                  response.statusCode === 401
                    ? new RegistryAuthenticationError()
                    : new GenericNetworkError()
                )
              );
            } else if (responseData.ok) resolve(Ok(responseData.token));

            // TODO: Handle error
          }
        );
      })
    );
  };
}
