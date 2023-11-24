import { Brand } from "ts-brand";
import semver from "semver/preload";
import assert from "assert";

/**
 * A string with a semantic-version format
 * @see https://semver.org/
 */
export type SemanticVersion = Brand<string, "SemanticVersion">;

/**
 * Checks if a string is a semantic version
 * @param s The string
 */
export function isSemanticVersion(s: string): s is SemanticVersion {
  return semver.parse(s) !== null;
}

/**
 * Constructs a semantic version from a string.
 * @param s The string. Will be validated.
 */
export function semanticVersion(s: string): SemanticVersion {
  assert(isSemanticVersion(s), `"${s}" is a semantic version`);
  return s;
}
