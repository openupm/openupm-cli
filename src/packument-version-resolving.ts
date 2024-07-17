import { VersionReference } from "./domain/package-reference";
import {
  UnityPackument,
  UnityPackumentVersion,
  VersionNotFoundError,
} from "./domain/packument";
import { PackageUrl } from "./domain/package-url";
import { RegistryUrl } from "./domain/registry-url";
import { Err } from "ts-results-es";
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
export type ResolvePackumentVersionError =
  | PackumentNotFoundError
  | VersionNotFoundError;

/**
 * Compares two resolve-failures to check which is more fixable.
 * @param a The first failure.
 * @param b The second failure.
 * @returns The more fixable failure.
 */
export function pickMostFixable(
  a: Err<ResolvePackumentVersionError>,
  b: Err<ResolvePackumentVersionError>
): Err<ResolvePackumentVersionError> {
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
