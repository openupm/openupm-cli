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
 * An empty packument cache.
 */
export const emptyPackumentCache: PackumentCache = {};

/**
 * Attempts to get a cached packument from a cache.
 * @param cache The cache.
 * @param packageName The name of the packument.
 */
export function tryGetFromCache(
  cache: PackumentCache,
  packageName: DomainName
): CachedPackument | null {
  return cache[packageName] ?? null;
}

/**
 * Caches a packument.
 * @param cache The current state of the cache.
 * @param packument The packument.
 * @param upstream Whether the packument was resolved from the upstream registry.
 * @returns The new state of the cache.
 */
export function addToCache(
  cache: PackumentCache,
  packument: UnityPackument,
  upstream: boolean
): PackumentCache {
  return { ...cache, [packument.name]: { packument, upstream } };
}
