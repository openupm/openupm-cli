import path from "path";
import fse from "fs-extra";
import { assertIsError } from "./error-type-guards";
import { Err, Ok, Result } from "ts-results-es";

function projectVersionTxtPathFor(projectDirPath: string) {
  return path.join(projectDirPath, "ProjectSettings", "ProjectVersion.txt");
}

/**
 * Creates a ProjectVersion.txt file for a Unity project.
 * Nothing besides m_EditorVersion is specified.
 * @param projectDirPath The projects root folder.
 * @param version The editor-version to use.
 */
export async function tryCreateProjectVersionTxt(
  projectDirPath: string,
  version: string
): Promise<Result<void, Error>> {
  try {
    const filePath = projectVersionTxtPathFor(projectDirPath);
    await fse.ensureDir(path.dirname(filePath));
    const data = `m_EditorVersion: ${version}`;
    await fse.writeFile(filePath, data);
    return Ok(undefined);
  } catch (error) {
    assertIsError(error);
    return Err(error);
  }
}
