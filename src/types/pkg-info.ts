import { SemanticVersion } from "./semantic-version";
import { DomainName } from "./domain-name";
import { PkgVersionInfo } from "./pkg-version-info";

/**
 * Describes a package
 */
export type PkgInfo = {
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
  versions: Record<SemanticVersion, PkgVersionInfo>;
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

const hasLatestDistTag = (
  pkgInfo: Partial<PkgInfo>
): pkgInfo is Partial<PkgInfo> & {
  "dist-tags": { latest: SemanticVersion };
} => {
  return pkgInfo["dist-tags"]?.["latest"] !== undefined;
};

/**
 * Attempt to get the latest version from a package
 * @param pkgInfo The package. All properties are assumed to be potentially missing
 */
export const tryGetLatestVersion = function (pkgInfo: {
  "dist-tags"?: { latest?: SemanticVersion };
  version?: SemanticVersion;
}): SemanticVersion | undefined {
  if (hasLatestDistTag(pkgInfo)) return pkgInfo["dist-tags"].latest;
  else if (pkgInfo.version) return pkgInfo.version;
};
