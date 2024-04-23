import path from "path";
import { AsyncResult, Err, Ok } from "ts-results-es";
import { FileParseError } from "../common-errors";
import { FileReadError, tryReadTextFromFile } from "./file-io";
import { StringFormatError, tryParseYaml } from "../utils/data-parsing";

export type ProjectVersionLoadError =
  | FileReadError
  | StringFormatError
  | FileParseError;

function projectVersionTxtPathFor(projectDirPath: string) {
  return path.join(projectDirPath, "ProjectSettings", "ProjectVersion.txt");
}

/**
 * Attempts to load a projects editor-version from ProjectVersion.txt.
 * @param projectDirPath The path to the projects root directory.
 */
export function tryLoadProjectVersion(
  projectDirPath: string
): AsyncResult<string, ProjectVersionLoadError> {
  const filePath = projectVersionTxtPathFor(projectDirPath);

  return tryReadTextFromFile(filePath)
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
}
