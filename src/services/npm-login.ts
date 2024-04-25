import RegClient from "another-npm-registry-client";
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
 * Error which may occur when logging a user into a npm registry.
 */
export type NpmLoginError = AuthenticationError;

/**
 * A token authenticating a user.
 */
type AuthenticationToken = string;

/**
 * Service function for authenticating users with a npm registry.
 * @param registryUrl The url of the registry into which to login.
 * @param username The username with which to login.
 * @param email The email with which to login.
 * @param password The password with which to login.
 * @returns An authentication token or null if registration failed.
 */
export type NpmLoginService = (
  registryUrl: RegistryUrl,
  username: string,
  email: string,
  password: string
) => AsyncResult<AuthenticationToken, NpmLoginError>;

/**
 * Makes a new {@link NpmLoginService} function.
 */
export function makeNpmLoginService(
  registryClient: RegClient.Instance
): NpmLoginService {
  return (registryUrl, username, email, password) => {
    return new AsyncResult(
      new Promise((resolve) => {
        registryClient.adduser(
          registryUrl,
          { auth: { username, email, password } },
          (error, responseData, _, response) => {
            if (response !== undefined && !responseData.ok)
              resolve(
                Err(
                  new AuthenticationError(
                    response.statusCode,
                    response.statusMessage
                  )
                )
              );
            else if (responseData.ok) resolve(Ok(responseData.token));

            // TODO: Handle error
          }
        );
      })
    );
  };
}
