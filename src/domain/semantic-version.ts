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
