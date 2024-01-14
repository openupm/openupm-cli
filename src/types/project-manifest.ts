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
  scopedRegistries?: ScopedRegistry[];
  /**
   * Lists the names of packages whose tests you want to load in the
   * Unity Test Framework.
   */
  testables?: DomainName[];
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
  if (manifest.scopedRegistries === undefined) manifest.scopedRegistries = [];
  manifest.scopedRegistries.push(scopedRegistry);
}

/**
 * Adds a testable to the manifest, if it is not already added.
 * @param manifest The manifest.
 * @param name The testable name.
 */
export function addTestable(manifest: UnityProjectManifest, name: DomainName) {
  if (!manifest.testables) manifest.testables = [];
  if (manifest.testables.indexOf(name) === -1) manifest.testables.push(name);
  manifest.testables.sort();
}

/**
 * Determines the path to the package manifest based on the working
 * directory (Root of Unity project).
 * @param workingDirectory The working directory.
 */
export function manifestPathFor(workingDirectory: string): string {
  return path.join(workingDirectory, "Packages/manifest.json");
}
