import { SemanticVersion } from "./semantic-version";
import { DomainName } from "./domain-name";
import { PkgVersionInfo } from "./global";

export type PkgInfo = {
  name: DomainName;
  _id?: DomainName;
  _rev?: string;
  _attachments?: Record<string, unknown>;
  readme?: string;
  versions: Record<SemanticVersion, PkgVersionInfo>;
  "dist-tags"?: { latest?: SemanticVersion };
  version?: SemanticVersion;
  description?: string;
  keywords?: string[];
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
