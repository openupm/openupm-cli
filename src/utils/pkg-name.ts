import { PkgName, PkgVersion } from "../types/global";
import { DomainName } from "../types/domain-name";

/**
 * Split package-name, which may include a version into the actual name of the
 * package and the version if it exists
 */
export const splitPkgName = function (pkgName: PkgName): {
  name: DomainName;
  version: PkgVersion | undefined;
} {
  const segments = pkgName.split("@");
  const name = segments[0] as DomainName;
  const version =
    segments.length > 1
      ? segments.slice(1, segments.length).join("@")
      : undefined;
  return { name, version };
};

/**
 * Merges a package name and version to create a package name for that specific version
 * @param name The name of the package
 * @param version The version of the package
 */
export const atVersion = (name: DomainName, version: PkgVersion): PkgName =>
  `${name}@${version}`;
