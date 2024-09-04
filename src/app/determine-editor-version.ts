import { ReleaseVersion } from "../domain/editor-version";
import { validateProjectVersion } from "../domain/project-version";
import { loadProjectVersionUsing } from "../io/project-version-io";
import { readTextFile, type ReadTextFile } from "../io/text-file-io";
import { DebugLog } from "../logging";
import { partialApply } from "../utils/fp-utils";

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
 * Makes a {@link DetermineEditorVersion} function which determines the editor
 * version based on the content of the project version file.
 */
export function DetermineEditorVersionFromFile(
  readTextFile: ReadTextFile,
  debugLog: DebugLog
): DetermineEditorVersion {
  const loadPorjectVersion = partialApply(
    loadProjectVersionUsing,
    readTextFile,
    debugLog
  );

  return async (projectPath) => {
    const unparsedEditorVersion = await loadPorjectVersion(projectPath);
    return validateProjectVersion(unparsedEditorVersion);
  };
}

/**
 * Default {@link DetermineEditorVersion} function. Uses {@link DetermineEditorVersionFromFile}.
 */
export const determineEditorVersionUsing = (debugLog: DebugLog) =>
  DetermineEditorVersionFromFile(readTextFile, debugLog);
