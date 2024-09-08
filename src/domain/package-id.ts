import { DomainName } from "./domain-name";
import { SemanticVersion } from "./semantic-version";
import { trySplitAtFirstOccurrenceOf } from "./string-utils";
import { isZod } from "./zod-utils";

/**
 * Represents a package at a specific version. The version is here is a
 * concrete semantic version.
 * @example com.abc.my-package@1.2.3
 */
export type PackageId = `${DomainName}@${SemanticVersion}`;

/**
 * Checks if a string is a package-id.
 * @param s The string.
 */
export function isPackageId(s: string): s is PackageId {
  const [name, version] = trySplitAtFirstOccurrenceOf(s, "@");
  return (
    isZod(name, DomainName) &&
    version !== null &&
    isZod(version, SemanticVersion)
  );
}

/**
 * Constructs a package-id.
 * @param name The package name.
 * @param version The version.
 */
export function makePackageId(
  name: DomainName,
  version: SemanticVersion
): PackageId {
  return `${name}@${version}`;
}
