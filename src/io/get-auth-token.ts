import RegClient, { type AddUserResponse } from "another-npm-registry-client";
import { RegistryUrl } from "../domain/registry-url";
import { DebugLog } from "../domain/logging";
import { RegistryAuthenticationError } from "./common-errors";

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
