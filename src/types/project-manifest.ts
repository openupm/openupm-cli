import { DomainName } from "./domain-name";
import { SemanticVersion } from "./semantic-version";
import { PackageUrl } from "./package-url";
import { ScopedRegistry } from "./scoped-registry";
import { RegistryUrl } from "./registry-url";
import path from "path";
import { removeTrailingSlash } from "../utils/string-utils";

/**
 * The content of the project-manifest (manifest.json) of a Unity project.
 * @see https://docs.unity3d.com/Manual/upm-manifestPrj.html
 */
export type UnityProjectManifest = {
  /**
   * Collection of packages required for your project. This includes only
   * direct dependencies. Each entry maps the package name to the minimum
   * version required for the project.
   */
  dependencies: Record<DomainName, SemanticVersion | PackageUrl>;
  /**
   * Enables a lock file to ensure that dependencies are resolved in a
   * deterministic manner.
   */
  enableLockFile?: boolean;
  /**
   * Upgrades indirect dependencies based on Semantic Versioning rules.
   */
  resolutionStrategy?: string;
  /**
   * Specify custom registries in addition to the default registry.
   * This allows you to host your own packages.
   */
  scopedRegistries?: ReadonlyArray<ScopedRegistry>;
  /**
   * Lists the names of packages whose tests you want to load in the
   * Unity Test Framework.
   */
  testables?: ReadonlyArray<DomainName>;
};

/**
 * Constructs an empty package-manifest.
 */
export function emptyProjectManifest(): UnityProjectManifest {
  return { dependencies: {} };
}

/**
 * Adds a dependency to the manifest. If a dependency with that name already
 * exists, the version is overwritten.
 * @param manifest The manifest.
 * @param name The dependency name.
 * @param version The dependency version or url.
 */
export function addDependency(
  manifest: UnityProjectManifest,
  name: DomainName,
  version: SemanticVersion | PackageUrl
) {
  if (manifest.dependencies === undefined) manifest.dependencies = {};
  manifest.dependencies[name] = version;
}

/**
 * Removes a dependency from a manifest.
 * @param manifest The manifest.
 * @param name The dependency name.
 */
export function removeDependency(
  manifest: UnityProjectManifest,
  name: DomainName
) {
  if (manifest.dependencies === undefined) return;
  delete manifest.dependencies[name];
}

/**
 * Attempts to get a scoped-registry with a specific url from the manifest.
 * @param manifest The manifest.
 * @param url The url.
 * @returns The scoped-registry or null if not found.
 */
export function tryGetScopedRegistryByUrl(
  manifest: UnityProjectManifest,
  url: RegistryUrl
): ScopedRegistry | null {
  function hasCorrectUrl(registry: ScopedRegistry): boolean {
    return removeTrailingSlash(registry.url) === url;
  }

  return manifest.scopedRegistries?.find(hasCorrectUrl) ?? null;
}

/**
 * Adds a scoped-registry to the manifest.
 * NOTE: Does not check if a scoped-registry with the same name already exists.
 * @param manifest The manifest.
 * @param scopedRegistry The scoped-registry.
 */
export function addScopedRegistry(
  manifest: UnityProjectManifest,
  scopedRegistry: ScopedRegistry
) {
  if (manifest.scopedRegistries === undefined) {
    manifest.scopedRegistries = [scopedRegistry];
    return;
  }

  manifest.scopedRegistries = [...manifest.scopedRegistries, scopedRegistry];
}

/**
 * Removes a scoped-registry to the manifest.
 * @param manifest The manifest.
 * @param name The name of the scoped-registry to remove.
 */
export function removeScopedRegistry(
  manifest: UnityProjectManifest,
  name: string
) {
  if (manifest.scopedRegistries === undefined) return;

  manifest.scopedRegistries = manifest.scopedRegistries.filter(
    (it) => it.name !== name
  );
}

/**
 * Adds a testable to the manifest, if it is not already added.
 * @param manifest The manifest.
 * @param name The testable name.
 */
export function addTestable(manifest: UnityProjectManifest, name: DomainName) {
  if (!manifest.testables) {
    manifest.testables = [name];
    return;
  }

  if (manifest.testables.indexOf(name) !== -1) return;

  manifest.testables = [...manifest.testables, name].sort();
}

/**
 * Determines the path to the package manifest based on the project
 * directory.
 * @param projectPath The root path of the Unity project.
 */
export function manifestPathFor(projectPath: string): string {
  return path.join(projectPath, "Packages/manifest.json");
}

/**
 * Prunes the manifest by performing the following operations:
 *  - Remove scoped-registries without scopes.
 * @param manifest The manifest to prune.
 */
export function pruneManifest(manifest: UnityProjectManifest) {
  if (manifest.scopedRegistries !== undefined) {
    manifest.scopedRegistries.forEach((registry) => {
      if (registry.scopes.length === 0)
        removeScopedRegistry(manifest, registry.name);
    });
  }
}
