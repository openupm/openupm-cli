import { VersionNotFoundError } from "./domain/packument";
import { PackumentNotFoundError } from "./common-errors";

/**
 * A failed attempt at resolving a packument-version.
 */
export type ResolvePackumentVersionError =
  | PackumentNotFoundError
  | VersionNotFoundError;
