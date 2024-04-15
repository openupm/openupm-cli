import { RegistryUrl } from "./registry-url";
import { NpmAuth } from "another-npm-registry-client";

/**
 * Represents a remote npm-registry.
 */
export type Registry = Readonly<{
  /**
   * The registries url.
   */
  url: RegistryUrl;
  /**
   * The authentication information used for this registry. Null if the registry
   * does not require authentication.
   */
  auth: NpmAuth | null;
}>;
