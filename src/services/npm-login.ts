import RegClient from "another-npm-registry-client";
import { RegistryUrl } from "../domain/registry-url";
import { RegistryAuthenticationError } from "../io/common-errors";
import { DebugLog } from "../logging";

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
) => Promise<AuthenticationToken>;

/**
 * Makes a new {@link NpmLogin} function.
 */
export function makeNpmLogin(
  registryClient: RegClient.Instance,
  debugLog: DebugLog
): NpmLogin {
  return (registryUrl, username, email, password) =>
    new Promise((resolve, reject) => {
      registryClient.adduser(
        registryUrl,
        { auth: { username, email, password } },
        (error, responseData, _, response) => {
          if (response !== undefined && !responseData.ok) {
            debugLog(
              "Npm registry login failed because of not-ok response.",
              response
            );
            reject(new RegistryAuthenticationError(registryUrl));
          } else if (responseData.ok) resolve(responseData.token);
          reject(error);
        }
      );
    });
}
