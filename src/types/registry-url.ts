import { Brand } from "ts-brand";
import assert from "assert";

/**
 * A string of a http-based registry-url
 */
export type RegistryUrl = Brand<string, "RegistryUrl">;

/**
 * Checks that a string is a valid registry
 * @param s The string
 */
export function isRegistryUrl(s: string): s is RegistryUrl {
  return /http(s?):\/\//.test(s);
}

/**
 * Constructs a registry-url
 * @param s The string
 * @throws assert.AssertionError if string does not have valid format
 */
export function registryUrl(s: string): RegistryUrl {
  assert(isRegistryUrl(s), `"${s}" is url`);
  return s;
}

/**
 * Removes trailing slash from a registry-url
 * @param registry The url
 */
export function removeTrailingSlash(registry: RegistryUrl): RegistryUrl {
  if (registry.endsWith("/")) return registry.slice(0, -1) as RegistryUrl;
  return registry;
}

/**
 * Attempts to coerce a string into a registry-url, by
 * - Prepending http if it is missing
 * - Removing trailing slashes
 * @param s The string
 */
export function coerceRegistryUrl(s: string): RegistryUrl {
  if (!s.toLowerCase().startsWith("http")) s = "http://" + s;
  return removeTrailingSlash(registryUrl(s));
}
