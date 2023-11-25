import { DomainName } from "./domain-name";
import { SemanticVersion } from "./semantic-version";
import { PackageUrl } from "./package-url";
import { ScopedRegistry } from "./scoped-registry";
import { RegistryUrl, removeTrailingSlash } from "./registry-url";

/**
 * The content of the package-manifest (manifest.json) of a Unity project
 * @see https://docs.unity3d.com/Manual/upm-manifestPrj.html
 */
export type PkgManifest = {
  /**
   * Direct dependencies, keyed by their name. Version can be either a
   * semantic version or package-url
   */
  dependencies: Record<DomainName, SemanticVersion | PackageUrl>;
  /**
   * Scoped-registries for this project
   */
  scopedRegistries?: ScopedRegistry[];
  /**
   * Testable package-names
   */
  testables?: DomainName[];
};

/**
 * Constructs an empty package-manifest
 */
export function emptyPackageManifest(): PkgManifest {
  return { dependencies: {} };
}

/**
 * Adds a dependency to the manifest. If a dependency with that name already
 * exists, the version is overwritten
 * @param manifest The manifest
 * @param name The dependency name
 * @param version The dependency version or url
 */
export function addDependency(
  manifest: PkgManifest,
  name: DomainName,
  version: SemanticVersion | PackageUrl
) {
  manifest.dependencies[name] = version;
}

/**
 * Removes a dependency from a manifest
 * @param manifest The manifest
 * @param name The dependency name
 */
export function removeDependency(manifest: PkgManifest, name: DomainName) {
  delete manifest.dependencies[name];
}

/**
 * Attempts to get a scoped-registry with a specific url from the manifest
 * @param manifest The manifest
 * @param url The url
 * @returns The scoped-registry or null if not found
 */
export function tryGetScopedRegistryByUrl(
  manifest: PkgManifest,
  url: RegistryUrl
): ScopedRegistry | null {
  function hasCorrectUrl(registry: ScopedRegistry): boolean {
    return removeTrailingSlash(registry.url) === url;
  }

  return manifest.scopedRegistries?.find(hasCorrectUrl) ?? null;
}

/**
 * Adds a scoped-registry to the manifest.
 * NOTE: Does not check if a scoped-registry with the same name already exists
 * @param manifest The manifest
 * @param scopedRegistry The scoped-registry
 */
export function addScopedRegistry(
  manifest: PkgManifest,
  scopedRegistry: ScopedRegistry
) {
  if (manifest.scopedRegistries === undefined) manifest.scopedRegistries = [];
  manifest.scopedRegistries.push(scopedRegistry);
}

/**
 * Adds a testable to the manifest, if it is not already added
 * @param manifest The manifest
 * @param name The testable name
 */
export function addTestable(manifest: PkgManifest, name: DomainName) {
  if (!manifest.testables) manifest.testables = [];
  if (manifest.testables.indexOf(name) === -1) manifest.testables.push(name);
  manifest.testables.sort();
}
