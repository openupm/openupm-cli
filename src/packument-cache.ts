import { DomainName } from "./domain/domain-name";
import { UnityPackument } from "./domain/packument";
import { RegistryUrl } from "./domain/registry-url";

type CachedRegistry = Readonly<{
  [name: DomainName]: UnityPackument;
}>;

/**
 * A cache that contains packuments that were already resolved.
 */
export type PackumentCache = Readonly<{
  [source: RegistryUrl]: CachedRegistry;
}>;

/**
 * An empty packument cache.
 */
export const emptyPackumentCache: PackumentCache = {};

/**
 * Attempts to get a cached packument from a cache.
 * @param cache The cache.
 * @param source The source from which to resolve the packument.
 * @param packageName The name of the packument.
 */
export function tryGetFromCache(
  cache: PackumentCache,
  source: RegistryUrl,
  packageName: DomainName
): UnityPackument | null {
  return cache[source]?.[packageName] ?? null;
}

/**
 * Caches a packument.
 * @param cache The current state of the cache.
 * @param source The packument source.
 * @param packument The packument.
 * @returns The new state of the cache.
 */
export function addToCache(
  cache: PackumentCache,
  source: RegistryUrl,
  packument: UnityPackument
): PackumentCache {
  const registry = cache[source] ?? {};
  return { ...cache, [source]: { ...registry, [packument.name]: packument } };
}
