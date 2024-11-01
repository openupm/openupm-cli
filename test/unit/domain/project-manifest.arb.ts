import fc, { type Arbitrary } from "fast-check";
import {
  type DependencyVersion,
  type UnityProjectManifest,
} from "../../../src/domain/project-manifest.js";
import { UnityProjectManifestBuilder } from "../../common/data-project-manifest.js";
import { arbDomainName } from "./domain-name.arb.js";
import { arbPackageUrl } from "./package-url.arb.js";
import { arbSemanticVersion } from "./semantic-version.arb.js";

/**
 * Arbitrary {@link abrDependencyVersion}.
 */
export const abrDependencyVersion: Arbitrary<DependencyVersion> = fc.oneof(
  arbSemanticVersion,
  arbPackageUrl
);

function withArbDependencies(
  builder: UnityProjectManifestBuilder,
  dependencyCount: number
): Arbitrary<UnityProjectManifest> {
  if (dependencyCount === 0) return fc.constant(builder.manifest);

  return fc
    .tuple(arbDomainName, abrDependencyVersion, fc.boolean())
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
