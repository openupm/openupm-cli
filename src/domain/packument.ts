import { SemanticVersion } from "./semantic-version";
import { DomainName } from "./domain-name";
import { UnityPackageManifest } from "./package-manifest";
import { PackageId } from "./package-id";
import { Dist, Maintainer } from "@npm/types";
import { CustomError } from "ts-custom-error";
import { Err, Ok, Result } from "ts-results-es";
import { recordKeys } from "../utils/record-utils";
import { ResolvableVersion } from "../packument-version-resolving";

/**
 * Contains information about a specific version of a package. This is based on
 * the information contained inside a Unity package manifest, with some
 * additions.
 */
export type UnityPackumentVersion = Readonly<
  UnityPackageManifest & {
    /**
     * Same as {@link name}.
     */
    _id?: PackageId;
    _nodeVersion?: string;
    _npmVersion?: string;
    _rev?: string;
    homepage?: string;
    category?: string;
    gitHead?: string;
    readmeFilename?: string;
    contributors?: ReadonlyArray<Maintainer>;
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
   * Same as {@link name}.
   */
  _id?: DomainName;
  _rev?: string;
  _attachments?: Readonly<Record<string, unknown>>;
  readme?: string;
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
  date?: Date;
  users?: Readonly<Record<string, unknown>>;
}>;

/**
 * The minimum properties a Packument must have in order for it's version
 * to be determined.
 */
export type VersionedPackument = Pick<UnityPackument, "dist-tags" | "version">;

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
export const tryGetLatestVersion = function (
  packument: VersionedPackument
): SemanticVersion | undefined {
  if (hasLatestDistTag(packument)) return packument["dist-tags"].latest;

  if (packument.version !== undefined) return packument.version;

  return undefined;
};

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
 * Attempts to resolve a specific version from a packument. Resolve here means
 * that this function also accepts non-semantic versions and will attempt to
 * find the correct version from the packument. This differentiates it from
 * {@link tryGetPackumentVersion}.
 * @param packument The packument to search.
 * @param requestedVersion The requested version.
 */

export function tryResolvePackumentVersion(
  packument: UnityPackument,
  requestedVersion: undefined | "latest"
): Result<UnityPackumentVersion, never>;
export function tryResolvePackumentVersion(
  packument: UnityPackument,
  requestedVersion: ResolvableVersion
): Result<UnityPackumentVersion, VersionNotFoundError>;
export function tryResolvePackumentVersion(
  packument: UnityPackument,
  requestedVersion: ResolvableVersion
) {
  const availableVersions = recordKeys(packument.versions);
  if (availableVersions.length === 0) throw new NoVersionsError(packument.name);

  // Find the latest version
  if (requestedVersion === undefined || requestedVersion === "latest") {
    let latestVersion = tryGetLatestVersion(packument);
    if (latestVersion === undefined) latestVersion = availableVersions.at(-1)!;
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
