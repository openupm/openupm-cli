import { Registry } from "../domain/registry";
import npmFetch from "npm-registry-fetch";

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
