import { Brand } from "ts-brand";
import assert from "assert";

/**
 * A string matching the format of a domain name.
 * @example com.unity
 * @example com.my-company
 */
export type DomainName = Brand<string, "DomainName">;

const segmentRegex = /^(?!.*--|^-.*|.*-$)[a-zA-Z0-9-]+$/;

function domainSegmentsIn(hostName: string): string[] {
  return hostName.split(".");
}

/**
 * Checks if a string is a domain name. Only does basic syntax validation.
 * Does not check for correct segment-count etc.
 * @param s The string.
 */
export function isDomainName(s: string): s is DomainName {
  const segments = domainSegmentsIn(s);
  if (segments === null || segments.length === 0) return false;
  return segments.every((segment) => segmentRegex.test(segment));
}

/**
 * Detect if the given package name is an internal package.
 * @param name The name of the package.
 */
export const isInternalPackage = (name: DomainName): boolean => {
  const internals = [
    "com.unity.ugui",
    "com.unity.2d.sprite",
    "com.unity.2d.tilemap",
    "com.unity.package-manager-ui",
    "com.unity.ugui",
  ];
  return /com.unity.modules/i.test(name) || internals.includes(name);
};

/**
 * Constructs a domain-name from a string.
 * @param s The string.
 * @throws {assert.AssertionError} If string is not in valid format.
 */
export function makeDomainName(s: string): DomainName {
  assert(isDomainName(s), `"${s}" is a domain name`);
  return s;
}
