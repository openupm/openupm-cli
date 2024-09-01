import { NpmAuth } from "another-npm-registry-client";
import npmFetch from "npm-registry-fetch";
import { RegistryUrl, unityRegistryUrl } from "./registry-url";

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

export const unityRegistry: Registry = {
  url: unityRegistryUrl,
  auth: null,
};

/**
 * Converts a {@link Registry} object into a {@link npmFetch.Options} object for
 * use in npm registry interactions.
 * @param registry The registry object to convert.
 * @returns The created options object.
 */
export function makeNpmFetchOptions(registry: Registry): npmFetch.Options {
  const opts: npmFetch.Options = {
    registry: registry.url,
  };
  const auth = registry.auth;
  if (auth !== null) Object.assign(opts, auth);
  return opts;
}
