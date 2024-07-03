import {
  isRelease,
  ReleaseVersion,
  tryParseEditorVersion,
} from "../domain/editor-version";
import { LoadProjectVersion } from "../io/project-version-io";

/**
 * Function for determining the editor-version for a Unity project.
 * @param projectPath The path to the projects root directory.
 * @returns The editor-version. Either a parsed version object or the raw
 * version string if it could not be parsed.
 */
export type DetermineEditorVersion = (
  projectPath: string
) => Promise<ReleaseVersion | string>;

/**
 * Makes a {@link DetermineEditorVersion} function.
 */
export function makeDetermineEditorVersion(
  loadProjectVersion: LoadProjectVersion
): DetermineEditorVersion {
  return async (projectPath) => {
    const unparsedEditorVersion = await loadProjectVersion(projectPath);
    const parsedEditorVersion = tryParseEditorVersion(unparsedEditorVersion);
    return parsedEditorVersion !== null && isRelease(parsedEditorVersion)
      ? parsedEditorVersion
      : unparsedEditorVersion;
  };
}
