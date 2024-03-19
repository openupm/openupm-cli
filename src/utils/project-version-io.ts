import path from "path";
import fse from "fs-extra";
import { AsyncResult, Err, Ok, Result } from "ts-results-es";
import yaml from "yaml";
import { FileParseError } from "../common-errors";
import { FileReadError, tryReadTextFromFile } from "./file-io";
import { assertIsError } from "./error-type-guards";

export type ProjectVersionLoadError = FileReadError | FileParseError;

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
export function tryLoadProjectVersion(
  projectDirPath: string
): Promise<Result<string, ProjectVersionLoadError>> {
  const filePath = projectVersionTxtPathFor(projectDirPath);

  return tryReadTextFromFile(filePath)
    .andThen((text) =>
      Result.wrap(() => yaml.parse(text) as unknown).mapErr((error) => {
        assertIsError(error);
        return new FileParseError(filePath, "ProjectVersion.txt", error);
      })
    )
    .andThen((content) => {
      if (
        !(
          typeof content === "object" &&
          content !== null &&
          "m_EditorVersion" in content &&
          typeof content.m_EditorVersion === "string"
        )
      )
        return Err(new FileParseError(filePath, "Project-version"));

      return Ok(content.m_EditorVersion);
    }).promise;
}
