import { Brand } from "ts-brand";
import semver from "semver/preload";

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
