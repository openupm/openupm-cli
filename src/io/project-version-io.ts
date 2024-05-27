import path from "path";
import { AsyncResult, Err, Ok } from "ts-results-es";
import { FileParseError } from "../common-errors";
import { FsError, ReadTextFile } from "./file-io";
import { StringFormatError, tryParseYaml } from "../utils/string-parsing";

function projectVersionTxtPathFor(projectDirPath: string) {
  return path.join(projectDirPath, "ProjectSettings", "ProjectVersion.txt");
}

/**
 * Error which may occur when loading a project-version.
 */
export type ProjectVersionLoadError =
  | FsError
  | StringFormatError
  | FileParseError;

/**
 * Function for loading a projects editor version string.
 * @param projectDirPath The path to the projects root directory.
 * @returns A string describing the projects editor version ie 2020.2.1f1.
 */
export type LoadProjectVersion = (
  projectDirPath: string
) => AsyncResult<string, ProjectVersionLoadError>;

/**
 * Makes a {@link LoadProjectVersion} function.
 */
export function makeProjectVersionLoader(
  readFile: ReadTextFile
): LoadProjectVersion {
  return (projectDirPath) => {
    const filePath = projectVersionTxtPathFor(projectDirPath);

    return readFile(filePath)
      .andThen(tryParseYaml)
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
      });
  };
}
