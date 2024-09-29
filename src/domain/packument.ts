import { Dist } from "@npm/types";
import { CustomError } from "ts-custom-error";
import { Err, Ok, Result } from "ts-results-es";
import { PackumentNotFoundError } from "./common-errors";
import { DomainName } from "./domain-name";
import { UnityPackageManifest } from "./package-manifest";
import { ResolvableVersion } from "./package-reference";
import { recordKeys } from "./record-utils";
import { SemanticVersion } from "./semantic-version";

/**
 * Contains information about a specific version of a package. This is based on
 * the information contained inside a Unity package manifest, with some
 * additions.
 */
export type UnityPackumentVersion = Readonly<
  UnityPackageManifest & {
    homepage?: string;
    dist?: Readonly<Dist>;
  }
>;

/**
 * Describes a package.
 */
export type UnityPackument = Readonly<{
  /**
   * The packages name.
   */
  name: DomainName;
  /**
   * The packages versions, organized by their version.
   */
  versions: Readonly<Record<SemanticVersion, UnityPackumentVersion>>;
  /**
   * Dist-tags. Only includes information about the latest version.
   */
  "dist-tags"?: Readonly<{ latest?: SemanticVersion }>;
  /**
   * May contain the latest version. Legacy property, use {@link dist-tags}
   * instead.
   */
  version?: SemanticVersion;
  /**
   * Short description for the package.
   */
  description?: string;
  /**
   * Package keywords.
   */
  keywords?: string[];
  /**
   * Information about package and version creation/modification times.
   */
  time?: Readonly<{
    [key: SemanticVersion]: string;
    created?: string;
    modified?: string;
  }>;
  // eslint-disable-next-line jsdoc/require-jsdoc
  date?: Date;
}>;

/**
 * The minimum properties a Packument must have in order for it's version
 * to be determined.
 */
export type VersionedPackument = Pick<UnityPackument, "dist-tags" | "version">;

/**
 * A type representing a searched packument. Instead of having all versions
 * this type only includes the latest version.
 */
export type SearchedPackument = Readonly<
  Omit<UnityPackument, "versions"> & {
    versions: Readonly<Record<SemanticVersion, "latest">>;
  }
>;

const hasLatestDistTag = <T extends VersionedPackument>(
  packument: T
): packument is T & {
  "dist-tags": { latest: SemanticVersion };
} => {
  return packument["dist-tags"]?.["latest"] !== undefined;
};

/**
 * Attempt to get the latest version from a package.
 * @param packument The package. All properties are assumed to be potentially
 * missing.
 */
export function tryGetLatestVersion(
  packument: VersionedPackument
): SemanticVersion | null {
  if (hasLatestDistTag(packument)) return packument["dist-tags"].latest;

  if (packument.version !== undefined) return packument.version;

  return null;
}

/**
 * Attempts to get a specific version from a packument.
 * @param packument The packument.
 * @param version The version to search.
 * @returns The packument-version or null if not found.
 */
export function tryGetPackumentVersion(
  packument: UnityPackument,
  version: SemanticVersion
): UnityPackumentVersion | null {
  return packument.versions[version] ?? null;
}

/**
 * Error for when a packument with the searched name was found, but it
 * had no versions.
 */
export class NoVersionsError extends CustomError {
  constructor(public readonly packageName: DomainName) {
    super();
  }
}

/**
 * Error for when a packument with the searched name was found, but a specific
 * requested version did not exist.
 */
export class VersionNotFoundError extends CustomError {
  constructor(
    public readonly packageName: DomainName,
    public readonly requestedVersion: SemanticVersion,
    /**
     * A list of available versions.
     */
    public readonly availableVersions: ReadonlyArray<SemanticVersion>
  ) {
    super();
  }
}

/**
 * A failed attempt at resolving a packument-version.
 */
export type ResolvePackumentVersionError =
  | PackumentNotFoundError
  | VersionNotFoundError;

/**
 * Resolved the latest version from a packument.
 * @param packument The packument.
 * @param requestedVersion The version to resolve. In this case indicates that
 * the latest version is requested.
 * @returns Result containing the resolved version. Will never be error.
 * @throws {NoVersionsError} If the packument had no versions at all.
 */
export function tryResolvePackumentVersion(
  packument: UnityPackument,
  requestedVersion: "latest"
): Result<UnityPackumentVersion, never>;
/**
 * Attempts to resolve a specific version from a packument.
 * @param packument The packument.
 * @param requestedVersion The version to resolve.
 * @returns Result containing the resolved version. Will be error if the
 * version was not found.
 */
export function tryResolvePackumentVersion(
  packument: UnityPackument,
  requestedVersion: SemanticVersion
): Result<UnityPackumentVersion, VersionNotFoundError>;
/**
 * Attempts to resolve a version from a packument.
 * @param packument The packument.
 * @param requestedVersion The version to resolve.
 * @returns A result containing the version or an error if it could not be
 * resolved.
 * @throws {NoVersionsError} If the packument had no versions at all.
 */
export function tryResolvePackumentVersion(
  packument: UnityPackument,
  requestedVersion: ResolvableVersion
): Result<UnityPackumentVersion, VersionNotFoundError>;
// eslint-disable-next-line jsdoc/require-jsdoc
export function tryResolvePackumentVersion(
  packument: UnityPackument,
  requestedVersion: ResolvableVersion
) {
  const availableVersions = recordKeys(packument.versions);
  if (availableVersions.length === 0) throw new NoVersionsError(packument.name);

  // Find the latest version
  if (requestedVersion === "latest") {
    let latestVersion = tryGetLatestVersion(packument);
    if (latestVersion === null) latestVersion = availableVersions.at(-1)!;
    return Ok(tryGetPackumentVersion(packument, latestVersion)!);
  }

  // Find a specific version
  if (!availableVersions.includes(requestedVersion))
    return Err(
      new VersionNotFoundError(
        packument.name,
        requestedVersion,
        availableVersions
      )
    );

  return Ok(tryGetPackumentVersion(packument, requestedVersion)!);
}

/**
 * Checks whether a packument has an entry for a version.
 * @param packument The packument to check.
 * @param version The version to check for.
 */
export function packumentHasVersion(
  packument: UnityPackument,
  version: SemanticVersion
): boolean {
  const versions = recordKeys(packument.versions);
  return versions.includes(version);
}
