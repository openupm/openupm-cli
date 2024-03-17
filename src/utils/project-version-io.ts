import path from "path";
import fse from "fs-extra";
import { AsyncResult, Result } from "ts-results-es";

/**
 * Creates a ProjectVersion.txt file for a Unity project.
 * Nothing besides m_EditorVersion is specified.
 * @param projectDirPath The projects root folder.
 * @param version The editor-version to use.
 */
export function tryCreateProjectVersionTxt(
  projectDirPath: string,
  version: string
): AsyncResult<void, Error> {
  return new AsyncResult(
    Result.wrapAsync(async () => {
      const projectSettingsDir = path.join(projectDirPath, "ProjectSettings");
      await fse.mkdirp(projectSettingsDir);
      const data = `m_EditorVersion: ${version}`;
      await fse.writeFile(
        path.join(projectSettingsDir, "ProjectVersion.txt"),
        data
      );
    })
  );
}
