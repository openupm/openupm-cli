import { DomainName } from "./types/domain-name";
import { UnityPackument } from "./types/packument";

type CachedPackument = { packument: UnityPackument; upstream: boolean };

export type PackumentCache = Record<DomainName, CachedPackument>;

export function tryGetFromCache(
  packageName: DomainName,
  cache: PackumentCache
): CachedPackument | null {
  return cache[packageName] ?? null;
}

export function addToCache(
  packageName: DomainName,
  packument: UnityPackument,
  upstream: boolean,
  cache: PackumentCache
): PackumentCache {
  return { ...cache, [packageName]: { packument, upstream } };
}
