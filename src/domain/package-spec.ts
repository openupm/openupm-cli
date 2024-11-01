import assert from "assert";
import { DomainName } from "./domain-name";
import { PackageUrl } from "./package-url";
import { SemanticVersion } from "./semantic-version";
import { trySplitAtFirstOccurrenceOf } from "./string-utils";
import { assertZod, isZod } from "./zod-utils";

/**
 * The "latest" tag string. Specifies that the latest version is requested.
 */
export type LatestTag = "latest";

/**
 * The "stable" tag string. Specifies that the latest stable version is
 * requested.
 */
export type StableTag = "stable";

/**
 * A string with the format of one of the supported version tags.
 */
export type PackageTag = LatestTag | StableTag;

/**
 * Reference to a version, either directly by a semantic version or via an
 * url or tag.
 */
export type VersionReference = SemanticVersion | PackageUrl | PackageTag;

/**
 * A package-spec that includes a version.
 */
export type PackageAtVersion = `${DomainName}@${VersionReference}`;

/**
 * A {@link VersionReference} that is resolvable.
 * Mostly this excludes {@link PackageUrl}s.
 */
export type ResolvableVersion = Exclude<VersionReference, PackageUrl>;

/**
 * References a package. Could be just the name or a reference to a specific
 * version. Not as specific as a {@link PackageId} as other version-formats
 * besides semantic versions, such as "latest" are also allowed.
 * @see https://docs.npmjs.com/cli/v8/using-npm/package-spec
 */
export type PackageSpec = DomainName | PackageAtVersion;

/**
 * Checks if a string is a version-reference.
 * @param s The string.
 */
function isVersionReference(s: string): s is VersionReference {
  return (
    s === "latest" ||
    s === "stable" ||
    isZod(s, SemanticVersion) ||
    isZod(s, PackageUrl)
  );
}

/**
 * Checks if a string is a package-spec.
 * @param s The string.
 */
export function isPackageSpec(s: string): s is PackageSpec {
  const [name, version] = trySplitAtFirstOccurrenceOf(s, "@");
  return (
    isZod(name, DomainName) && (version === null || isVersionReference(version))
  );
}

/**
 * Split a package-spec into the name and version if present.
 * @param spec The spec.
 */
export function splitPackageSpec(
  spec: PackageSpec
): [DomainName, VersionReference | null] {
  const [name, version] = trySplitAtFirstOccurrenceOf(spec, "@") as [
    DomainName,
    VersionReference | null
  ];
  return [name, version];
}

/**
 * Constructs a package-spec.
 * @param name The package-name. Will be validated to be a {@link DomainName}.
 * @param version Optional version-reference. Will be validated to be a
 * {@link VersionReference}.
 */
export function makePackageSpec(
  name: string,
  version: string | null
): PackageSpec {
  assertZod(name, DomainName);
  if (version === null) return name;
  assert(
    isVersionReference(version),
    `"${version}" is not a valid version reference.`
  );
  return `${name}@${version}`;
}

/**
 * Checks if the package-spec includes a version.
 * @param spec The package-spec.
 */
export function hasVersion(spec: PackageSpec): spec is PackageAtVersion {
  return spec.includes("@");
}
