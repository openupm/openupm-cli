type LocaleCode = "c";

type ReleaseFlag = "a" | "b" | "f" | "c";

type RegularVersion = {
  /**
   * The major version. This is the release year.
   */
  readonly major: number;
  /**
   * The minor version. This is usually a number from 1 to 3.
   */
  readonly minor: number;
};

/**
 * An object representing a patch editor version.
 */
export type PatchVersion = RegularVersion & {
  /**
   * A patch.
   */
  readonly patch: number;
};

/**
 * An object representing a release editor version.
 */
export type ReleaseVersion = PatchVersion & {
  /**
   * A flag describing a specific release.
   */
  readonly flag: ReleaseFlag;
  /**
   * A specific build.
   */
  readonly build: number;
};

type LocalVersion = ReleaseVersion & {
  /**
   * A flag describing a specific locale build.
   */
  readonly loc: LocaleCode;
  /**
   * The specific build for a locale.
   */
  readonly locBuild: number;
};

/**
 * Describes a version of a Unity editor. Mostly this follows calendar-versioning,
 * with some extra rules for chinese releases.
 * @see https://calver.org/
 */
export type EditorVersion = RegularVersion | PatchVersion | LocalVersion;

function localeValue(loc: LocaleCode): number {
  if (loc === "c") return 1;
  throw new Error("Unknown locale");
}

function releaseValue(flag: ReleaseFlag): number {
  if (flag === "b") return 1;
  if (flag === "f") return 2;
  return 0;
}

function isPatch(version: EditorVersion): version is PatchVersion {
  return "patch" in version;
}

/**
 * Checks whether an editor version is a {@link ReleaseVersion}.
 * @param version The version to check.
 */
export function isRelease(version: EditorVersion): version is ReleaseVersion {
  return isPatch(version) && "flag" in version;
}

function isLocal(version: EditorVersion): version is LocalVersion {
  return isRelease(version) && "loc" in version;
}

/**
 * Compares two editor versions for ordering.
 * @param verA The first version.
 * @param verB The second version.
 * @returns A number indicating the ordering.
 */
export const compareEditorVersion = function (
  verA: EditorVersion,
  verB: EditorVersion
): -1 | 0 | 1 {
  const editorVersionToArray = (ver: EditorVersion) => [
    ver.major,
    ver.minor,
    isPatch(ver) ? ver.patch : 0,
    ...(isRelease(ver) ? [releaseValue(ver.flag), ver.build] : [0, 0]),
    ...(isLocal(ver)
      ? [ver.build, localeValue(ver.loc), ver.locBuild]
      : [0, 0, 0]),
  ];
  const arrA = editorVersionToArray(verA);
  const arrB = editorVersionToArray(verB);
  for (let i = 0; i < arrA.length; i++) {
    const valA = arrA[i]!;
    const valB = arrB[i]!;
    if (valA > valB) return 1;
    else if (valA < valB) return -1;
  }
  return 0;
};

/**
 * Attempts to parse editor version string to groups.
 */
export const tryParseEditorVersion = function (
  version: string
): EditorVersion | null {
  type RegexMatchGroups = {
    major: `${number}`;
    minor: `${number}`;
    patch?: string;
    flag?: "a" | "b" | "f" | "c";
    build?: `${number}`;
    loc?: "c";
    locBuild?: `${number}`;
  };
  const regex =
    /^(?<major>\d+)\.(?<minor>[1234])(\.(?<patch>\d+)((?<flag>a|b|f|c)(?<build>\d+)((?<loc>c)(?<locBuild>\d+))?)?)?/;
  const match = regex.exec(version);
  if (!match) return null;
  const groups = <RegexMatchGroups>match.groups;

  const regular: RegularVersion = {
    major: parseInt(groups.major),
    minor: parseInt(groups.minor),
  };

  if (!groups.patch) return regular;
  const patch: PatchVersion = {
    ...regular,
    patch: parseInt(groups.patch),
  };

  if (!(groups.flag && groups.build)) return patch;
  const release: ReleaseVersion = {
    ...patch,
    flag: groups.flag,
    build: parseInt(groups.build),
  };

  if (!(groups.loc && groups.locBuild)) return release;
  return {
    ...release,
    loc: groups.loc,
    locBuild: parseInt(groups.locBuild),
  } satisfies LocalVersion;
};

/**
 * Constructs a regular editor-version.
 */
export function makeEditorVersion(major: number, minor: number): RegularVersion;
/**
 * Constructs a patch editor-version.
 */
export function makeEditorVersion(
  major: number,
  minor: number,
  patch: number
): PatchVersion;
/**
 * Constructs a release editor-version.
 */
export function makeEditorVersion(
  major: number,
  minor: number,
  patch: number,
  flag: ReleaseFlag,
  build: number
): ReleaseVersion;
/**
 * Constructs an editor version.
 */
export function makeEditorVersion(
  major: number,
  minor: number,
  patch?: number,
  flag?: ReleaseFlag,
  build?: number
) {
  if (flag !== undefined) return { major, minor, patch, flag, build };
  if (patch !== undefined) return { major, minor, patch };
  return { major, minor };
}

/**
 * Converts an editor-version object to the corresponding string.
 * @param version The version to convert.
 */
export function stringifyEditorVersion(version: EditorVersion): string {
  if (isLocal(version))
    return `${version.major}.${version.minor}.${version.patch}${version.flag}${version.build}${version.loc}${version.locBuild}`;
  else if (isRelease(version))
    return `${version.major}.${version.minor}.${version.patch}${version.flag}${version.build}`;
  else if (isPatch(version))
    return `${version.major}.${version.minor}.${version.patch}`;
  return `${version.major}.${version.minor}`;
}
