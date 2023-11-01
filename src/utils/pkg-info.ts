import { PkgInfo, PkgVersion } from "../types/global";

const hasLatestDistTag = (
  pkgInfo: Partial<PkgInfo>
): pkgInfo is Partial<PkgInfo> & { "dist-tags": { latest: PkgVersion } } => {
  return pkgInfo["dist-tags"]?.["latest"] !== undefined;
};

/**
 * Attempt to get the latest version from a package
 * @param pkgInfo The package. All properties are assumed to be potentially missing
 */
export const tryGetLatestVersion = function (
  pkgInfo: Partial<PkgInfo>
): PkgVersion | undefined {
  if (hasLatestDistTag(pkgInfo)) return pkgInfo["dist-tags"].latest;
  else if (pkgInfo.version) return pkgInfo.version;
};
