import { DomainName, isDomainName } from "./domain-name";
import { isSemanticVersion, SemanticVersion } from "./semantic-version";
import { trySplitAtFirstOccurrenceOf } from "../utils/string-utils";

/**
 * Represents a package at a specific version. The version is here is a
 * concrete semantic version.
 * @example com.abc.my-package@1.2.3
 */
export type PackageId = `${DomainName}@${SemanticVersion}`;

/**
 * Checks if a string is a package-id
 * @param s The string
 */
export function isPackageId(s: string): s is PackageId {
  const [name, version] = trySplitAtFirstOccurrenceOf(s, "@");
  return (
    isDomainName(name) && version !== undefined && isSemanticVersion(version)
  );
}

/**
 * Constructs a package-id
 * @param name The package name
 * @param version The version
 */
export function packageId(
  name: DomainName,
  version: SemanticVersion
): PackageId {
  return `${name}@${version}`;
}
