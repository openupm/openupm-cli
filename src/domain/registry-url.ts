import { removeTrailingSlash } from "../utils/string-utils";
import { z } from "zod";

/**
 * Schema for {@link RegistryUrl}.
 */
export const RegistryUrl = z
  .string()
  .regex(/http(s?):\/\/.*[^/]$/)
  .brand("RegistryUrl");

/**
 * A string of a http-based registry-url.
 * Registry-urls may not have trailing slashes.
 */
export type RegistryUrl = z.TypeOf<typeof RegistryUrl>;

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
  return RegistryUrl.parse(s);
}

export const unityRegistryUrl = RegistryUrl.parse("https://packages.unity.com");
