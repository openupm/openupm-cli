import { DomainName } from "./types/domain-name";
import { UnityPackument } from "./types/packument";

/**
 * Represents a cached packument.
 */
type CachedPackument = {
  /**
   * The packument.
   */
  packument: UnityPackument;
  /**
   * Whether it was originally resolved from the upstream registry.
   */
  upstream: boolean;
};

/**
 * A cache that contains packuments that were already resolved.
 */
export type PackumentCache = Record<DomainName, CachedPackument>;

/**
 * Attempts to get a cached packument from a cache.
 * @param packageName The name of the packument.
 * @param cache The cache.
 */
export function tryGetFromCache(
  packageName: DomainName,
  cache: PackumentCache
): CachedPackument | null {
  return cache[packageName] ?? null;
}

/**
 * Caches a packument.
 * @param packageName The packuments name.
 * @param packument The packument.
 * @param upstream Whether the packument was resolved from the upstream registry.
 * @param cache The current state of the cache.
 * @returns The new state of the cache.
 */
export function addToCache(
  packageName: DomainName,
  packument: UnityPackument,
  upstream: boolean,
  cache: PackumentCache
): PackumentCache {
  return { ...cache, [packageName]: { packument, upstream } };
}
