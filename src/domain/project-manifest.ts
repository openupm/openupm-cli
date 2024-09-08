import path from "node:path";
import { z } from "zod";
import { DomainName } from "./domain-name";
import { PackageUrl } from "./package-url";
import { removeRecordKey } from "./record-utils";
import { RegistryUrl } from "./registry-url";
import { ScopedRegistry } from "./scoped-registry";
import { SemanticVersion } from "./semantic-version";
import { removeTrailingSlash } from "./string-utils";

/**
 * The content of the project-manifest (manifest.json) of a Unity project.
 * @see https://docs.unity3d.com/Manual/upm-manifestPrj.html
 */
export type UnityProjectManifest = Readonly<{
  /**
   * Collection of packages required for your project. This includes only
   * direct dependencies. Each entry maps the package name to the minimum
   * version required for the project.
   */
  dependencies: Readonly<Record<DomainName, SemanticVersion | PackageUrl>>;
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
}>;

/**
 * Constructs an empty package-manifest.
 */
export const emptyProjectManifest: UnityProjectManifest = { dependencies: {} };

/**
 * Sets a dependency in the manifest. If a dependency with that name already
 * exists, the version is overwritten.
 * @param manifest The manifest.
 * @param name The dependency name.
 * @param version The dependency version or url.
 */
export function setDependency(
  manifest: UnityProjectManifest,
  name: DomainName,
  version: SemanticVersion | PackageUrl
): UnityProjectManifest {
  return {
    ...manifest,
    dependencies: { ...manifest.dependencies, [name]: version },
  };
}

/**
 * Removes a dependency from a manifest.
 * @param manifest The manifest.
 * @param name The dependency name.
 */
export function removeDependency(
  manifest: UnityProjectManifest,
  name: DomainName
): UnityProjectManifest {
  if (manifest.dependencies === undefined) return manifest;

  return {
    ...manifest,
    dependencies: removeRecordKey(manifest.dependencies, name),
  };
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
 * Updates a scoped-registry in a manifest by applying a mapping-function to it.
 * @param manifest The manifest.
 * @param registryUrl The url of the scoped-registry that should be mapped.
 * @param mapF The mapping function. Gets the scoped-registry with the given
 * registry-url as input, or null if the manifest has no scoped-registry with
 * that url. The scoped-registry returned by the function will be written back
 * to the manifest. If the function returns null the scoped-registry will be
 * removed from the manifest.
 * @returns The updated manifest.
 */
export function mapScopedRegistry(
  manifest: UnityProjectManifest,
  registryUrl: RegistryUrl,
  mapF: (scopedRegistry: ScopedRegistry | null) => ScopedRegistry | null
): UnityProjectManifest {
  const updated = mapF(tryGetScopedRegistryByUrl(manifest, registryUrl));

  let newScopedRegistries =
    manifest.scopedRegistries?.filter(
      (it) => it.url !== (updated?.url ?? registryUrl)
    ) ?? [];

  if (updated !== null)
    newScopedRegistries = [...(newScopedRegistries ?? []), updated];

  return {
    ...manifest,
    scopedRegistries: newScopedRegistries,
  };
}

/**
 * Sets a scoped-registry in the manifest. If no scoped-registry with
 * the given url exists yet, it is added, otherwise it is overwritten.
 * @param manifest The manifest.
 * @param scopedRegistry The scoped-registry.
 */
export function setScopedRegistry(
  manifest: UnityProjectManifest,
  scopedRegistry: ScopedRegistry
): UnityProjectManifest {
  return mapScopedRegistry(manifest, scopedRegistry.url, () => scopedRegistry);
}

/**
 * Adds a testable to the manifest, if it is not already added.
 * @param manifest The manifest.
 * @param name The testable name.
 */
export function addTestable(
  manifest: UnityProjectManifest,
  name: DomainName
): UnityProjectManifest {
  if (manifest.testables?.includes(name)) return manifest;

  return {
    ...manifest,
    testables: [...(manifest.testables ?? []), name].sort(),
  };
}

/**
 * Checks if a manifest has a dependency on a specific package.
 */
export function hasDependency(
  manifest: UnityProjectManifest,
  packageName: DomainName
): boolean {
  return packageName in manifest.dependencies;
}

/**
 * Removes a package name from all scope lists of all scoped registries
 * in a manifest.
 * @param manifest The manifest.
 * @param packageName The package name.
 * @returns The manifest with the scope removed.
 */
export function removeScopeFromAllScopedRegistries(
  manifest: UnityProjectManifest,
  packageName: DomainName
): UnityProjectManifest {
  if (manifest.scopedRegistries === undefined) return manifest;
  return {
    ...manifest,
    scopedRegistries: manifest.scopedRegistries.map((scopedRegistry) => ({
      ...scopedRegistry,
      scopes: scopedRegistry.scopes.filter((scope) => scope !== packageName),
    })),
  };
}

/**
 * Removes all empty scoped registries from a manifest. A scoped registry
 * is empty, if it has no scopes.
 * @param manifest The manifest.
 * @returns The manifest without empty scoped registried.
 */
export function removeEmptyScopedRegistries(
  manifest: UnityProjectManifest
): UnityProjectManifest {
  if (manifest.scopedRegistries === undefined) return manifest;
  return {
    ...manifest,
    scopedRegistries: manifest.scopedRegistries.filter(
      (it) => it.scopes.length > 0
    ),
  };
}

/**
 * Removes a testable from this manifest.
 * @param manifest The manifest.
 * @param packageName The name of the testable to remove.
 * @returns The manifest without the testable.
 */
export function removeTestable(
  manifest: UnityProjectManifest,
  packageName: DomainName
): UnityProjectManifest {
  if (manifest.testables === undefined) return manifest;
  return {
    ...manifest,
    testables: manifest.testables.filter((it) => it !== packageName),
  };
}

/**
 * Determines the path to the package manifest based on the project
 * directory.
 * @param projectPath The root path of the Unity project.
 */
export function manifestPathFor(projectPath: string): string {
  return path.join(projectPath, "Packages/manifest.json");
}

// TODO: Add a better schema
const projectManifestSchema = z.object({}).passthrough();

/**
 * Parses the content of a `manifest.json` file to a {@link UnityProjectManifest}.
 * @param content The files content.
 * @returns The parsed file.
 * @throws {Error} If parsing failed.
 */
export function parseProjectManifest(content: string): UnityProjectManifest {
  const json = JSON.parse(content);
  return projectManifestSchema.parse(json) as UnityProjectManifest;
}

/**
 * Serializes a {@link UnityProjectManifest} object into json format.
 * @param manifest The manifest to serialize.
 * @returns The serialized manifest.
 */
export function serializeProjectManifest(
  manifest: UnityProjectManifest
): string {
  // Remove empty scoped registries
  if (manifest.scopedRegistries !== undefined)
    manifest = {
      ...manifest,
      scopedRegistries: manifest.scopedRegistries.filter(
        (it) => it.scopes.length > 0
      ),
    };

  return JSON.stringify(manifest, null, 2);
}
