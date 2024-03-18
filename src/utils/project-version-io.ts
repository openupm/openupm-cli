import path from "path";
import fse from "fs-extra";
import { assertIsError } from "./error-type-guards";
import { AsyncResult, Err, Ok, Result } from "ts-results-es";
import fs from "fs";
import yaml from "yaml";
import {
  FileParseError,
  IOError,
  RequiredFileNotFoundError,
} from "../common-errors";

export type ProjectVersionLoadError =
  | RequiredFileNotFoundError
  | FileParseError
  | IOError;

function projectVersionTxtPathFor(projectDirPath: string) {
  return path.join(projectDirPath, "ProjectSettings", "ProjectVersion.txt");
}

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

/**
 * Attempts to load a projects editor-version from ProjectVersion.txt.
 * @param projectDirPath The path to the projects root directory.
 */
export async function tryLoadProjectVersion(
  projectDirPath: string
): Promise<Result<string, ProjectVersionLoadError>> {
  const filePath = projectVersionTxtPathFor(projectDirPath);
  try {
    const projectVersionData = fs.readFileSync(filePath, "utf8");
    const projectVersionContent = yaml.parse(projectVersionData) as unknown;

    if (
      !(
        typeof projectVersionContent === "object" &&
        projectVersionContent !== null &&
        "m_EditorVersion" in projectVersionContent &&
        typeof projectVersionContent.m_EditorVersion === "string"
      )
    )
      return Err(new FileParseError(filePath, "Project-version"));

    return Ok(projectVersionContent.m_EditorVersion);
  } catch (error) {
    assertIsError(error);
    if (error.name === "ENOENT")
      return Err(new RequiredFileNotFoundError(filePath));
    return Err(new IOError(error));
  }
}
