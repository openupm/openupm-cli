import { PkgName, PkgVersion, ReverseDomainName } from "../types/global";

/**
 * Split package-name, which may include a version into the actual name of the
 * package and the version if it exists
 */
export const splitPkgName = function (pkgName: PkgName): {
  name: ReverseDomainName;
  version: PkgVersion | undefined;
} {
  const segments = pkgName.split("@");
  const name = segments[0];
  const version =
    segments.length > 1
      ? segments.slice(1, segments.length).join("@")
      : undefined;
  return { name, version };
};
