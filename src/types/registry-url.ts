import { Brand } from "ts-brand";
import assert from "assert";
import { removeTrailingSlash } from "../utils/string-utils";

/**
 * A string of a http-based registry-url.
 * Registry-urls may not have trailing slashes.
 */
export type RegistryUrl = Brand<string, "RegistryUrl">;

/**
 * Checks that a string is a valid registry.
 * @param s The string.
 */
export function isRegistryUrl(s: string): s is RegistryUrl {
  return /http(s?):\/\/.*[^/]$/.test(s);
}

/**
 * Constructs a registry-url.
 * @param s The string.
 * @throws {assert.AssertionError} If string does not have valid format.
 */
export function makeRegistryUrl(s: string): RegistryUrl {
  assert(isRegistryUrl(s), `"${s}" is url`);
  return s;
}

/**
 * Attempts to coerce a string into a registry-url, by
 * - Prepending http if it is missing.
 * - Removing trailing slashes.
 * @param s The string.
 * @throws {assert.AssertionError} If string does not have valid format.
 */
export function coerceRegistryUrl(s: string): RegistryUrl {
  if (!s.toLowerCase().startsWith("http")) s = "http://" + s;
  s = removeTrailingSlash(s);
  return makeRegistryUrl(s);
}

export const unityRegistryUrl = makeRegistryUrl("https://packages.unity.com");
