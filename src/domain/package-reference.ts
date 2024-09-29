import assert from "assert";
import { DomainName } from "./domain-name";
import { PackageUrl } from "./package-url";
import { SemanticVersion } from "./semantic-version";
import { trySplitAtFirstOccurrenceOf } from "./string-utils";
import { assertZod, isZod } from "./zod-utils";

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
 * A version-reference that is resolvable.
 * Mostly this excludes {@link PackageUrl}s.
 */
export type ResolvableVersion = Exclude<VersionReference, PackageUrl>;

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
  return s === "latest" || isZod(s, SemanticVersion) || isZod(s, PackageUrl);
}

/**
 * Checks if a string is a package-reference.
 * @param s The string.
 */
export function isPackageReference(s: string): s is PackageReference {
  const [name, version] = trySplitAtFirstOccurrenceOf(s, "@");
  return (
    isZod(name, DomainName) && (version === null || isVersionReference(version))
  );
}

/**
 * Split a package-reference into the name and version if present.
 * @param reference The reference.
 */
export function splitPackageReference(
  reference: PackageReference
): [DomainName, VersionReference | null] {
  const [name, version] = trySplitAtFirstOccurrenceOf(reference, "@") as [
    DomainName,
    VersionReference | null
  ];
  return [name, version];
}

/**
 * Constructs a package-reference.
 * @param name The package-name. Will be validated to be a {@link DomainName}.
 * @param version Optional version-reference. Will be validated to be a
 * {@link VersionReference}.
 */
export function makePackageReference(
  name: string,
  version: string | null
): PackageReference {
  assertZod(name, DomainName);
  if (version === null) return name;
  assert(
    isVersionReference(version),
    `"${version}" is not a valid version reference.`
  );
  return `${name}@${version}`;
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
