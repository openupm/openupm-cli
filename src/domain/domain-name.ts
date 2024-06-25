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
  if (segments.length === 0) return false;
  return segments.every((segment) => segmentRegex.test(segment));
}

/**
 * Constructs a domain-name from a string.
 * @param s The string.
 * @throws {assert.AssertionError} If string is not in valid format.
 */
export function makeDomainName(s: string): DomainName {
  assert(isDomainName(s), `"${s}" is a domain name`);
  return s;
}
