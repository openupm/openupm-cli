import {VersionReference} from "./domain/package-reference";
import {DomainName} from "./domain/domain-name";
import {
  tryResolvePackumentVersion,
  UnityPackument,
  UnityPackumentVersion,
  VersionNotFoundError,
} from "./domain/packument";
import {PackageUrl} from "./domain/package-url";
import {PackumentCache, tryGetFromCache} from "./packument-cache";
import {RegistryUrl} from "./domain/registry-url";
import {Err, Result} from "ts-results-es";
import {PackumentNotFoundError} from "./common-errors";
import {
  ResolveRemotePackumentVersionError
} from "./services/resolve-remote-packument-version";

/**
 * A version-reference that is resolvable.
 * Mostly this excludes {@link PackageUrl}s.
 */
export type ResolvableVersion =
  | Exclude<VersionReference, PackageUrl>
  | undefined;

/**
 * A successfully resolved packument-version.
 */
export interface ResolvedPackumentVersion {
  /**
   * The packument from which the version was resolved.
   */
  readonly packument: UnityPackument;
  /**
   * The resolved packument-version.
   */
  readonly packumentVersion: UnityPackumentVersion;
  /**
   * The source from which the packument was resolved.
   */
  readonly source: RegistryUrl;
}

/**
 * A failed attempt at resolving a packument-version.
 */
export type PackumentVersionResolveError =
  | PackumentNotFoundError
  | VersionNotFoundError;

/**
 * Attempts to resolve a packument-version from the cache.
 * @param cache The cache to search.
 * @param source The source from which to resolve.
 * @param packumentName The name of the packument to resolve.
 * @param requestedVersion The requested version.
 */
export function tryResolveFromCache(
  cache: PackumentCache,
  source: RegistryUrl,
  packumentName: DomainName,
  requestedVersion: ResolvableVersion
): Result<ResolvedPackumentVersion, PackumentVersionResolveError> {
  const cachedPackument = tryGetFromCache(cache, source, packumentName);
  if (cachedPackument === null)
    return Err(new PackumentNotFoundError(packumentName));

  return tryResolvePackumentVersion(cachedPackument, requestedVersion).map(
    (packumentVersion) => ({
      packument: cachedPackument,
      packumentVersion,
      source,
    })
  );
}

/**
 * Compares two resolve-failures to check which is more fixable.
 * @param a The first failure.
 * @param b The second failure.
 * @returns The more fixable failure.
 */
export function pickMostFixable(
  a: Err<ResolveRemotePackumentVersionError>,
  b: Err<ResolveRemotePackumentVersionError>
): Err<ResolveRemotePackumentVersionError> {
  // Anything is more fixable than packument-not-found
  if (
    a.error instanceof PackumentNotFoundError &&
    !(b.error instanceof PackumentNotFoundError)
  )
    return b;
  else if (
    b.error instanceof PackumentNotFoundError &&
    !(a.error instanceof PackumentNotFoundError)
  )
    return a;
  return a;
}
