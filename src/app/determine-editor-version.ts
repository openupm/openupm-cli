import { CustomError } from "ts-custom-error";
import { ReleaseVersion } from "../domain/editor-version";
import { assertIsError } from "../domain/error-type-guards";
import { partialApply } from "../domain/fp-utils";
import { DebugLog } from "../domain/logging";
import {
  projectVersionTxtPathFor,
  tryParseProjectVersionTxt,
  validateProjectVersion,
} from "../domain/project-version-txt";
import { type ReadTextFile } from "../io/text-file-io";

export class ProjectVersionMissingError extends CustomError {
  public constructor(public readonly expectedPath: string) {
    super();
  }
}

export class ProjectVersionMalformedError extends CustomError {}

async function loadProjectVersionUsing(
  readFile: ReadTextFile,
  debugLog: DebugLog,
  projectDirPath: string
): Promise<string> {
  const filePath = projectVersionTxtPathFor(projectDirPath);

  const content = await readFile(filePath);
  if (content === null) throw new ProjectVersionMissingError(filePath);

  try {
    return tryParseProjectVersionTxt(content);
  } catch (error) {
    assertIsError(error);
    await debugLog("ProjectVersion.txt has malformed yaml.", error);
    throw new ProjectVersionMalformedError();
  }
}

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
