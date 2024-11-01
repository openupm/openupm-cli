import { Err, Ok, type Result } from "ts-results-es";
import { PackumentNotFoundError } from "./common-errors.js";
import type { DomainName } from "./domain-name.js";
import { omitKey } from "./object-utils.js";
import {
  type DependencyVersion,
  type UnityProjectManifest,
  removeDependency,
  removeEmptyScopedRegistries,
  removeScopeFromAllScopedRegistries,
  removeTestable,
  setDependency,
} from "./project-manifest.js";
/**
 * A package that was removed from the manifest.
 */
export type RemovedPackage = {
  /**
   * The name of the removed package.
   */
  name: DomainName;
  /**
   * The version of the removed package.
   */
  version: DependencyVersion;
};

/**
 * Removes a dependency from a project manifest. This function will also take
 * care of appying changes to scoped registries and testables.
 * In comparison {@link removeDependency} will only remove the dependency.
 * @param manifest The manifest to remove the dependency from.
 * @param packageName The name of the dependency to remove.
 * @returns A result where the Ok case is a tuple with the updated manifest and
 * information about the removed package.
 */
export function tryRemoveProjectDependency(
  manifest: UnityProjectManifest,
  packageName: DomainName
): Result<[UnityProjectManifest, RemovedPackage], PackumentNotFoundError> {
  const versionInManifest = manifest.dependencies[packageName];
  if (versionInManifest === undefined)
    return Err(new PackumentNotFoundError(packageName));

  manifest = removeDependency(manifest, packageName);
  manifest = removeScopeFromAllScopedRegistries(manifest, packageName);
  manifest = removeEmptyScopedRegistries(manifest);
  manifest = removeTestable(manifest, packageName);

  // Remove scoped registries property if empty
  if (manifest.scopedRegistries?.length === 0)
    manifest = omitKey(manifest, "scopedRegistries");
  // Remove testables property if empty
  if (manifest.testables?.length === 0)
    manifest = omitKey(manifest, "testables");

  return Ok([manifest, { name: packageName, version: versionInManifest }]);
}

/**
 * Atomically removes multiple dependencies from a project manifest using
 * {@link tryRemoveProjectDependency}.
 * @param manifest The manifest to remove the dependencies from.
 * @param packageNames The names of the dependencies to remove.
 * @returns A result where the Ok case is a tuple with the updated manifest and
 * information about the removed packages.
 */
export function tryRemoveProjectDependencies(
  manifest: UnityProjectManifest,
  packageNames: ReadonlyArray<DomainName>
): Result<
  [UnityProjectManifest, ReadonlyArray<RemovedPackage>],
  PackumentNotFoundError
> {
  if (packageNames.length == 0) return Ok([manifest, []]);

  const currentPackageName = packageNames[0]!;
  const remainingPackageNames = packageNames.slice(1);

  return tryRemoveProjectDependency(manifest, currentPackageName).andThen(
    ([updatedManifest, removedPackage]) =>
      tryRemoveProjectDependencies(updatedManifest, remainingPackageNames).map(
        ([finalManifest, removedPackages]) => [
          finalManifest,
          [removedPackage, ...removedPackages],
        ]
      )
  );
}

/**
 * The result of adding a dependency.
 */
export type AddResult =
  | {
      /**
       * Indicates that the dependency was added.
       */
      type: "added";
      /**
       * The version that was added.
       */
      version: DependencyVersion;
    }
  | {
      /**
       * Indicates that the dependency was already present in the manifest and
       * only it's version was changed.
       */
      type: "upgraded";
      /**
       * The version that was in the manifest previously.
       */
      fromVersion: DependencyVersion;
      /**
       * The new version.
       */
      toVersion: DependencyVersion;
    }
  | {
      /**
       * Indicates that the manifest already contained the dependency.
       */
      type: "noChange";
      /**
       * The version in the manifest.
       */
      version: DependencyVersion;
    };

/**
 * Adds a dependency to a project manifest.
 * @param manifest The manifest to add the dependency to.
 * @param packageName The name of the dependency to add.
 * @param version Version of the dependency to add.
 * @returns Tuple containing the updated manifest and an object containing
 * information about how the manifest changed.
 */
export function addProjectDependency(
  manifest: UnityProjectManifest,
  packageName: DomainName,
  version: DependencyVersion
): [UnityProjectManifest, AddResult] {
  const oldVersion = manifest.dependencies[packageName];

  manifest = setDependency(manifest, packageName, version);

  if (!oldVersion) {
    return [
      manifest,
      {
        type: "added",
        version: version,
      },
    ];
  } else if (oldVersion !== version) {
    return [
      manifest,
      {
        type: "upgraded",
        fromVersion: oldVersion,
        toVersion: version,
      },
    ];
  } else {
    return [
      manifest,
      {
        type: "noChange",
        version: version,
      },
    ];
  }
}
