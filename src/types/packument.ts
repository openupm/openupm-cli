import { SemanticVersion } from "./semantic-version";
import { DomainName } from "./domain-name";
import { UnityPackageManifest } from "./package-manifest";
import { PackageId } from "./package-id";
import { Dist, Maintainer } from "@npm/types";

/**
 * Contains information about a specific version of a package. This is based on
 * the information contained inside a Unity package manifest, with some
 * additions.
 */
export type UnityPackumentVersion = UnityPackageManifest & {
  /**
   * Same as {@link name}
   */
  _id?: PackageId;
  _nodeVersion?: string;
  _npmVersion?: string;
  _rev?: string;
  homepage?: string;
  category?: string;
  gitHead?: string;
  readmeFilename?: string;
  contributors?: Maintainer[];
  dist?: Dist;
};

/**
 * Describes a package
 */
export type UnityPackument = {
  /**
   * The packages name
   */
  name: DomainName;
  /**
   * Same as {@link name}
   */
  _id?: DomainName;
  _rev?: string;
  _attachments?: Record<string, unknown>;
  readme?: string;
  /**
   * The packages versions, organized by their version
   */
  versions: Record<SemanticVersion, UnityPackumentVersion>;
  /**
   * Dist-tags. Only includes information about the latest version
   */
  "dist-tags"?: { latest?: SemanticVersion };
  /**
   * May contain the latest version. Legacy property, use {@link dist-tags} instead
   */
  version?: SemanticVersion;
  /**
   * Short description for the package
   */
  description?: string;
  /**
   * Package keywords
   */
  keywords?: string[];
  /**
   * Information about package and version creation/modification times
   */
  time: {
    [key: SemanticVersion]: string;
    created?: string;
    modified?: string;
  };
  date?: Date;
  users?: Record<string, unknown>;
};

function hasLatestDistTag(
  packument: Partial<UnityPackument>
): packument is Partial<UnityPackument> & {
  "dist-tags": { latest: SemanticVersion };
} {
  return packument["dist-tags"]?.["latest"] !== undefined;
}

/**
 * Attempt to get the latest version from a package
 * @param packument The package. All properties are assumed to be potentially missing
 */
export function tryGetLatestVersion(packument: {
  "dist-tags"?: { latest?: SemanticVersion };
  version?: SemanticVersion;
}): SemanticVersion | undefined {
  if (hasLatestDistTag(packument)) return packument["dist-tags"].latest;
  else if (packument.version) return packument.version;
}
