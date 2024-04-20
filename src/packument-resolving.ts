import { VersionReference } from "./domain/package-reference";
import { DomainName } from "./domain/domain-name";
import { SemanticVersion } from "./domain/semantic-version";
import {
  tryGetLatestVersion,
  UnityPackument,
  UnityPackumentVersion,
} from "./domain/packument";
import { recordKeys } from "./utils/record-utils";
import { PackageUrl } from "./domain/package-url";
import { PackumentCache, tryGetFromCache } from "./packument-cache";
import { RegistryUrl } from "./domain/registry-url";
import { CustomError } from "ts-custom-error";
import { Err, Ok, Result } from "ts-results-es";
import { PackumentNotFoundError } from "./common-errors";

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
export interface ResolvedPackument {
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
 * Error for when a packument with the searched name was found, but it
 * had no versions.
 */
export class NoVersionsError extends CustomError {
  private readonly _class = "NoVersionsError";
  constructor() {
    super("A packument contained no versions");
  }
}

/**
 * Error for when a packument with the searched name was found, but a specific
 * requested version did not exist.
 */
export class VersionNotFoundError extends CustomError {
  private readonly _class = "VersionNotFoundError";
  constructor(
    /**
     * The version that was requested.
     */
    readonly requestedVersion: SemanticVersion,
    /**
     * A list of available versions.
     */
    readonly availableVersions: ReadonlyArray<SemanticVersion>
  ) {
    super("The requested version was not in the packument.");
  }
}

/**
 * A failed attempt at resolving a packument-version.
 */
export type PackumentResolveError =
  | PackumentNotFoundError
  | NoVersionsError
  | VersionNotFoundError;

/**
 * Attempts to resolve a specific version from a packument.
 * @param packument The packument to search.
 * @param requestedVersion The requested version.
 * @param source The source from which the packument was resolved.
 */
export function tryResolveFromPackument(
  packument: UnityPackument,
  requestedVersion: ResolvableVersion,
  source: RegistryUrl
): Result<ResolvedPackument, PackumentResolveError> {
  const availableVersions = recordKeys(packument.versions);
  if (availableVersions.length === 0) return Err(new NoVersionsError());

  // Find the latest version
  if (requestedVersion === undefined || requestedVersion === "latest") {
    let latestVersion = tryGetLatestVersion(packument);
    if (latestVersion === undefined) latestVersion = availableVersions.at(-1)!;
    return Ok({
      packument,
      source,
      packumentVersion: packument.versions[latestVersion]!,
    } satisfies ResolvedPackument);
  }

  // Find a specific version
  if (!availableVersions.includes(requestedVersion))
    return Err(new VersionNotFoundError(requestedVersion, availableVersions));

  return Ok({
    packument,
    source,
    packumentVersion: packument.versions[requestedVersion]!,
  } satisfies ResolvedPackument);
}

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
): Result<ResolvedPackument, PackumentResolveError> {
  const cachedPackument = tryGetFromCache(cache, source, packumentName);
  if (cachedPackument === null) return Err(new PackumentNotFoundError());

  return tryResolveFromPackument(cachedPackument, requestedVersion, source);
}

/**
 * Compares two resolve-failures to check which is more fixable.
 * @param a The first failure.
 * @param b The second failure.
 * @returns The more fixable failure.
 */
export function pickMostFixable(
  a: Err<PackumentResolveError>,
  b: Err<PackumentResolveError>
): Err<PackumentResolveError> {
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
