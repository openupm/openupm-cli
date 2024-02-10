import { DomainName, isDomainName } from "./domain-name";
import { isSemanticVersion, SemanticVersion } from "./semantic-version";
import { isPackageUrl, PackageUrl } from "./package-url";
import { trySplitAtFirstOccurrenceOf } from "../utils/string-utils";
import assert from "assert";
import { registryUrl } from "./registry-url";

/**
 * A string with the format of one of the supported version tags.
 * NOTE: Currently we only support "latest".
 */
export type PackageTag = "latest";

/**
 * Reference to a version, either directly by a semantic version or via an
 * url or tag.
 */
export type VersionReference = SemanticVersion | PackageUrl | PackageTag;

/**
 * A package reference that includes a version.
 */
export type ReferenceWithVersion = `${DomainName}@${VersionReference}`;

/**
 * References a package. Could be just the name or a reference to a specific
 * version. Not as specific as a {@link PackageId} as other version-formats
 * besides semantic versions, such as "latest" are also allowed.
 */
export type PackageReference = DomainName | ReferenceWithVersion;

/**
 * Checks if a string is a version-reference.
 * @param s The string.
 */
function isVersionReference(s: string): s is VersionReference {
  return s === "latest" || isSemanticVersion(s) || isPackageUrl(s);
}

/**
 * Checks if a string is a package-reference.
 * @param s The string.
 */
export function isPackageReference(s: string): s is PackageReference {
  const [name, version] = trySplitAtFirstOccurrenceOf(s, "@");
  return (
    isDomainName(name) && (version === undefined || isVersionReference(version))
  );
}

/**
 * Split a package-reference into the name and version if present.
 * @param reference The reference.
 */
export function splitPackageReference(
  reference: PackageReference
): [DomainName, VersionReference | undefined] {
  return trySplitAtFirstOccurrenceOf(reference, "@") as [
    DomainName,
    VersionReference | undefined
  ];
}

/**
 * Constructs a package-reference.
 * @param name The package-name. Will be validated to be a {@link DomainName}.
 * @param version Optional version-reference. Will be validated to be a
 * {@link VersionReference}.
 */
export function packageReference(
  name: string,
  version?: string
): PackageReference {
  assert(isDomainName(name), `${name} is valid package-name`);
  assert(
    version === undefined || isVersionReference(version),
    `"${version}" is valid version-reference`
  );
  return version !== undefined ? `${name}@${version}` : name;
}

/**
 * Checks if the package-reference includes a version.
 * @param reference The package-reference.
 */
export function hasVersion(
  reference: PackageReference
): reference is ReferenceWithVersion {
  return reference.includes("@");
}
