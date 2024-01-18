import path from "path";
import fse from "fs-extra";

/**
 * Creates a ProjectVersion.txt file for a Unity project.
 * Nothing besides m_EditorVersion is specified.
 * @param projectDirPath The projects root folder.
 * @param version The editor-version to use.
 */
export async function createProjectVersionTxt(
  projectDirPath: string,
  version: string
) {
  const projectSettingsDir = path.join(projectDirPath, "ProjectSettings");
  await fse.mkdirp(projectSettingsDir);
  const data = `m_EditorVersion: ${version}`;
  await fse.writeFile(
    path.join(projectSettingsDir, "ProjectVersion.txt"),
    data
  );
}
