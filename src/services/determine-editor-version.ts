import { AsyncResult } from "ts-results-es";
import {
  isRelease,
  ReleaseVersion,
  tryParseEditorVersion,
} from "../domain/editor-version";
import {
  LoadProjectVersion,
  ProjectVersionLoadError,
} from "../io/project-version-io";

/**
 * Error which may occur when determining the editor-version.
 */
export type DetermineEditorVersionError = ProjectVersionLoadError;

/**
 * Function for determining the editor-version for a Unity project.
 * @param projectPath The path to the projects root directory.
 * @returns The editor-version. Either a parsed version object or the raw
 * version string if it could not be parsed.
 */
export type DetermineEditorVersion = (
  projectPath: string
) => AsyncResult<ReleaseVersion | string, DetermineEditorVersionError>;

/**
 * Makes a {@link DetermineEditorVersion} function.
 */
export function makeEditorVersionDeterminer(
  loadProjectVersion: LoadProjectVersion
): DetermineEditorVersion {
  return (projectPath) => {
    return loadProjectVersion(projectPath).map((unparsedEditorVersion) => {
      const parsedEditorVersion = tryParseEditorVersion(unparsedEditorVersion);
      return parsedEditorVersion !== null && isRelease(parsedEditorVersion)
        ? parsedEditorVersion
        : unparsedEditorVersion;
    });
  };
}
