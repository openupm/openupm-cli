import { SemanticVersion } from "./semantic-version";
import { DomainName } from "./domain-name";
import { UnityPackageManifest } from "./package-manifest";
import { PackageId } from "./package-id";
import { Dist, Maintainer } from "@npm/types";
import { CustomError } from "ts-custom-error";

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
  else if (packument.version) return packument.version;
};

/**
 * Error for when a packument contained an invalid target editor-version.
 */
export class InvalidTargetEditorError extends CustomError {
  // noinspection JSUnusedLocalSymbols
  private readonly _class = "InvalidTargetEditorError";

  constructor(
    /**
     * The invalid editor-version string.
     */
    public readonly versionString: string
  ) {
    super();
  }
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
