import fc from "fast-check";
import { SemanticVersion } from "../../../src/domain/semantic-version";

const segment = fc.integer({ min: 0, max: 10 });

/**
 * An arbitrary {@link SemanticVersion} to be used in property tests.
 */
export const arbSemanticVersion = fc
  .tuple(segment, segment, segment)
  .map(([major, minor, patch]) =>
    SemanticVersion.parse(`${major}.${minor}.${patch}`)
  );
