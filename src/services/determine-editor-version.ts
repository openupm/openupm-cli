import { AsyncResult, Result } from "ts-results-es";
import {
  isRelease,
  ReleaseVersion,
  tryParseEditorVersion,
} from "../domain/editor-version";
import { LoadProjectVersion } from "../io/project-version-io";
import { resultifyAsyncOp } from "../utils/result-utils";

/**
 * Error which may occur when determining the editor-version.
 */
export type DetermineEditorVersionError = never;

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
export function makeDetermineEditorVersion(
  loadProjectVersion: LoadProjectVersion
): DetermineEditorVersion {
  return (projectPath) => {
    return resultifyAsyncOp(
      loadProjectVersion(projectPath).then((unparsedEditorVersion) => {
        const parsedEditorVersion = tryParseEditorVersion(
          unparsedEditorVersion
        );
        return parsedEditorVersion !== null && isRelease(parsedEditorVersion)
          ? parsedEditorVersion
          : unparsedEditorVersion;
      })
    );
  };
}
