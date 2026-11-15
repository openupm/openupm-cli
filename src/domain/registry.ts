import npmFetch, { type AuthOptions } from "npm-registry-fetch";
import { encodeBase64 } from "./base64";
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
  auth: AuthOptions | null;
}>;

/**
 * The official Unity registry.
 */
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
  // npm-registry-fetch ignores top-level token/username/password options. It
  // only reads credentials from registry-scoped keys or from forceAuth, which
  // also expects the basic-auth password to be base64 encoded.
  if (auth !== null)
    opts.forceAuth =
      auth.password !== undefined
        ? { ...auth, password: encodeBase64(auth.password) }
        : auth;
  return opts;
}
