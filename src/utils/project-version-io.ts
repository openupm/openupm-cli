import path from "path";
import fse from "fs-extra";
import { assertIsError } from "./error-type-guards";
import { Err, Ok, Result } from "ts-results-es";

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
    const projectSettingsDir = path.join(projectDirPath, "ProjectSettings");
    await fse.mkdirp(projectSettingsDir);
    const data = `m_EditorVersion: ${version}`;
    await fse.writeFile(
      path.join(projectSettingsDir, "ProjectVersion.txt"),
      data
    );
    return Ok(undefined);
  } catch (error) {
    assertIsError(error);
    return Err(error);
  }
}
