import semver from "semver/preload";
import { z } from "zod";

/**
 * Schema for {@link SemanticVersion}.
 */
export const SemanticVersion = z
  .string()
  .refine(semver.parse)
  .brand("SemanticVersion");

/**
 * A string with a semantic-version format.
 * @see https://semver.org/.
 */
export type SemanticVersion = z.TypeOf<typeof SemanticVersion>;

/**
 * Compares to semantic versions to see which is larger. Can be used for
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSorted Array.prototype.toSorted}.
 * @param a The first version.
 * @param b The second version.
 * @returns A number indicating the sorting order of the numbers.
 *   - a > b -> 1.
 *   - a = b -> 0.
 *   - a < b -> -1.
 */
export function compareVersions(
  a: SemanticVersion,
  b: SemanticVersion
): -1 | 0 | 1 {
  return semver.compare(a, b, false);
}

/**
 * Checks wheter a semantic version is stable.
 * @param version The version to check.
 */
export function isStable(version: SemanticVersion): boolean {
  return semver.prerelease(version) === null;
}
