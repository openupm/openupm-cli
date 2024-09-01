import { Err, Ok, type Result } from "ts-results-es";
import { PackumentNotFoundError } from "../common-errors";
import { omitKey } from "../utils/object-utils";
import type { DomainName } from "./domain-name";
import type { PackageUrl } from "./package-url";
import {
  type UnityProjectManifest,
  removeDependency,
  removeEmptyScopedRegistries,
  removeScopeFromAllScopedRegistries,
  removeTestable,
} from "./project-manifest";
import type { SemanticVersion } from "./semantic-version";

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
  version: SemanticVersion | PackageUrl;
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
