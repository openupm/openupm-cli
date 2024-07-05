import { CustomError } from "ts-custom-error";
import { RegistryUrl } from "../domain/registry-url";

/**
 * Error for when authentication with a registry failed.
 */
export class RegistryAuthenticationError extends CustomError {
  constructor(public readonly registryUrl: RegistryUrl) {
    super();
  }
}
