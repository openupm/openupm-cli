import fc, { type Arbitrary } from "fast-check";
import { type UnityProjectManifest } from "../../../src/domain/project-manifest";
import { UnityProjectManifestBuilder } from "./data-project-manifest";
import { arbDomainName } from "./domain-name.arb";
import { arbSemanticVersion } from "./semantic-version.arb";

function withArbDependencies(
  builder: UnityProjectManifestBuilder,
  dependencyCount: number
): Arbitrary<UnityProjectManifest> {
  if (dependencyCount === 0) return fc.constant(builder.manifest);

  return fc
    .tuple(arbDomainName, arbSemanticVersion, fc.boolean())
    .chain(([packageName, version, withTestable]) => {
      const withDependency = builder.addDependency(
        packageName,
        version,
        true,
        withTestable
      );
      return withArbDependencies(withDependency, dependencyCount - 1);
    });
}

/**
 * Makes an arbitrary for a {@link UnityProjectManifest} with a specific
 * number of dependencies.
 * @param dependencyCount The nuber of dependencies.
 * @returns The arbitrary.
 */
export function arbManifestWithDependencyCount(
  dependencyCount: number
): Arbitrary<UnityProjectManifest> {
  return withArbDependencies(
    UnityProjectManifestBuilder.empty,
    dependencyCount
  );
}

/**
 * Arbitrary {@link UnityProjectManifest} with 0 or more dependencies.
 */
export const arbManifest = fc
  .integer({ min: 0, max: 20 })
  .chain(arbManifestWithDependencyCount);

/**
 * Arbitrary {@link UnityProjectManifest} with at least 1 dependency.
 */
export const arbNonEmptyManifest = fc
  .integer({ min: 1, max: 20 })
  .chain(arbManifestWithDependencyCount);
