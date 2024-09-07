import { ReleaseVersion } from "../domain/editor-version";
import { validateProjectVersion } from "../domain/project-version";
import { loadProjectVersionUsing } from "../io/project-version-io";
import { type ReadTextFile } from "../io/text-file-io";
import { DebugLog } from "../domain/logging";
import { partialApply } from "../domain/fp-utils";

/**
 * Function for determining the editor-version for a Unity project.
 * @param readTextFile IO function for reading text files.
 * @param debugLog Function for printing debug messages.
 * @param projectPath The path to the projects root directory.
 * @returns The editor-version. Either a parsed version object or the raw
 * version string if it could not be parsed.
 */
export async function determineEditorVersionUsing(
  readTextFile: ReadTextFile,
  debugLog: DebugLog,
  projectPath: string
): Promise<ReleaseVersion | string> {
  const loadProjectVersion = partialApply(
    loadProjectVersionUsing,
    readTextFile,
    debugLog
  );

  const unparsedEditorVersion = await loadProjectVersion(projectPath);
  return validateProjectVersion(unparsedEditorVersion);
}
