import { PkgInfo, PkgVersion } from "../types/global";
import { SemanticVersion } from "../types/semantic-version";

const hasLatestDistTag = (
  pkgInfo: Partial<PkgInfo>
): pkgInfo is Partial<PkgInfo> & { "dist-tags": { latest: PkgVersion } } => {
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
