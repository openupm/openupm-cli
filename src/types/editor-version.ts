/**
 * Describes a version of a Unity editor. Mostly this follows calendar-versioning,
 * with some extra rules for chinese releases.
 * @see https://calver.org/
 */
export type EditorVersion = {
  /**
   * The major version. This is the release year.
   */
  major: number;
  /**
   * The minor version. This is usually a number from 1 to 3
   */
  minor: number;
  /**
   * An optional patch.
   */
  patch?: number;
  /**
   * A flag describing a specific release
   */
  flag?: "a" | "b" | "f" | "c";
  flagValue?: 0 | 1 | 2;
  /**
   * A specific build
   */
  build?: number;
  /**
   * A flag describing a specific locale build
   */
  loc?: string;
  locValue?: number;
  /**
   * The specific build for a locale
   */
  locBuild?: number;
};

/**
 * Compares two editor versions for ordering
 * @param a The first version
 * @param b The second version
 * @throws Error An editor version could not be parsed
 */
export const compareEditorVersion = function (
  a: string,
  b: string
): -1 | 0 | 1 {
  const verA = tryParseEditorVersion(a);
  const verB = tryParseEditorVersion(b);

  if (verA === null || verB === null)
    throw new Error("An editor version could not be parsed");

  const editorVersionToArray = (ver: EditorVersion) => [
    ver.major,
    ver.minor,
    ver.patch || 0,
    ver.flagValue || 0,
    ver.build || 0,
    ver.locValue || 0,
    ver.locBuild || 0,
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
 * Attempts to parse editor version string to groups
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
    /^(?<major>\d+)\.(?<minor>\d+)(\.(?<patch>\d+)((?<flag>a|b|f|c)(?<build>\d+)((?<loc>c)(?<locBuild>\d+))?)?)?/;
  const match = regex.exec(version);
  if (!match) return null;
  const groups = <RegexMatchGroups>match.groups;
  const result: EditorVersion = {
    major: parseInt(groups.major),
    minor: parseInt(groups.minor),
  };
  if (groups.patch) result.patch = parseInt(groups.patch);
  if (groups.flag) {
    result.flag = groups.flag;
    if (result.flag == "a") result.flagValue = 0;
    if (result.flag == "b") result.flagValue = 1;
    if (result.flag == "f") result.flagValue = 2;
    if (groups.build) result.build = parseInt(groups.build);
  }

  if (groups.loc) {
    result.loc = groups.loc.toLowerCase();
    if (result.loc == "c") result.locValue = 1;
    if (groups.locBuild) result.locBuild = parseInt(groups.locBuild);
  }
  return result;
};
