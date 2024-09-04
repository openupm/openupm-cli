import {
  isRelease,
  type ReleaseVersion,
  tryParseEditorVersion,
} from "./editor-version";

/**
 * Validates the content of a ProjectVersion.txt file. It should be a
 * {@link ReleaseVersion}.
 * @param unparsedEditorVersion The unvalidated version.
 * @returns Either the validated release version or the original string
 * if not a valid release version.
 */
export function validateProjectVersion(
  unparsedEditorVersion: string
): ReleaseVersion | string {
  const parsedEditorVersion = tryParseEditorVersion(unparsedEditorVersion);
  return parsedEditorVersion !== null && isRelease(parsedEditorVersion)
    ? parsedEditorVersion
    : unparsedEditorVersion;
}
