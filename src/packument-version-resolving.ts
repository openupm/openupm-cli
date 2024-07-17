import { VersionReference } from "./domain/package-reference";
import { VersionNotFoundError } from "./domain/packument";
import { PackageUrl } from "./domain/package-url";
import { PackumentNotFoundError } from "./common-errors";

/**
 * A version-reference that is resolvable.
 * Mostly this excludes {@link PackageUrl}s.
 */
export type ResolvableVersion =
  | Exclude<VersionReference, PackageUrl>
  | undefined;

/**
 * A failed attempt at resolving a packument-version.
 */
export type ResolvePackumentVersionError =
  | PackumentNotFoundError
  | VersionNotFoundError;
