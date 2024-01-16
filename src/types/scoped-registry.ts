import { RegistryUrl } from "./registry-url";
import { DomainName } from "./domain-name";

/**
 * Contains information about a scoped registry.
 * @see https://docs.unity3d.com/Manual/upm-scoped.html
 */
export type ScopedRegistry = {
  /**
   * The scope name as it appears in the user interface.
   */
  name: string;
  /**
   * The url to the npm-compatible registry server.
   */
  url: RegistryUrl;
  /**
   * Array of scopes that you can map to a package name, either as an exact match
   * on the package name, or as a namespace.
   */
  scopes: DomainName[];
};

/**
 * Constructs a scoped registry.
 * @param name The name.
 * @param url The url.
 * @param scopes The scopes. If not specified defaults to empty array.
 */
export function scopedRegistry(
  name: string,
  url: RegistryUrl,
  scopes?: DomainName[]
): ScopedRegistry {
  return { name, url, scopes: scopes ?? [] };
}

/**
 * Adds a scope to a registry. The list will be sorted alphabetically.
 * @param registry The registry.
 * @param scope The scope.
 */
export function addScope(registry: ScopedRegistry, scope: DomainName) {
  registry.scopes.push(scope);
  registry.scopes.sort();
}

/**
 * Checks if a registry has a specific scope.
 * @param registry The registry.
 * @param scope The scope.
 */
export function hasScope(registry: ScopedRegistry, scope: DomainName): boolean {
  return registry.scopes.includes(scope);
}

/**
 * Removes a scope from a registry.
 * @param registry The registry.
 * @param scope The scope.
 * @returns Boolean indicating whether a scope was actually removed.
 */
export function removeScope(
  registry: ScopedRegistry,
  scope: DomainName
): boolean {
  const prevCount = registry.scopes.length;
  registry.scopes = registry.scopes.filter((it) => it !== scope);
  return registry.scopes.length != prevCount;
}
