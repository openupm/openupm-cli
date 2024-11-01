import { CustomError } from "ts-custom-error";
import { RegistryUrl } from "../domain/registry-url.js";
import { isHttpError } from "../domain/error-type-guards.js";

/**
 * Error for when authentication with a registry failed.
 */
export class RegistryAuthenticationError extends CustomError {
  constructor(public readonly registryUrl: RegistryUrl) {
    super();
  }
}

/**
 * Type for {@link Error}s with a HTTP status code property.
 */
export interface HttpErrorLike extends Error {
  /**
   * The HTTP status code.
   */
  statusCode: number;
}

/**
 * Categorizes an error that occurred when interacting with a remote
 * npm registry into the relevant domain errors.
 *
 * The logic goes like this.
 *
 * - Non-http {@link Error}s -> get returned as is.
 * - Non-auth {@link HttpErrorLike}s -> get returned as is.
 * - Auth {@link HttpErrorLike}s -> get converted to a {@link RegistryAuthenticationError}.
 * @param error The error that occurred.
 * @param registryUrl The url of the registry that was interacted with.
 * @returns The categorized error.
 */
export function makeRegistryInteractionError(
  error: Error,
  registryUrl: RegistryUrl
): Error | HttpErrorLike | RegistryAuthenticationError {
  if (!isHttpError(error) || error.statusCode !== 401) return error;
  return new RegistryAuthenticationError(registryUrl);
}
