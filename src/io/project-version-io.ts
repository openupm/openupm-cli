import path from "path";
import { AsyncResult, Err, Ok, Result } from "ts-results-es";
import { ReadTextFile } from "./text-file-io";
import { StringFormatError, tryParseYaml } from "../utils/string-parsing";
import {
  FileMissingError,
  FileParseError,
  GenericIOError,
} from "./common-errors";

export function projectVersionTxtPathFor(projectDirPath: string) {
  return path.join(projectDirPath, "ProjectSettings", "ProjectVersion.txt");
}

/**
 * Error for when the ProjectVersion.txt is missing.
 */
export type ProjectVersionMissingError = FileMissingError<"ProjectVersion.txt">;

/**
 * Makes a {@link ProjectVersionMissingError} object.
 * @param filePath The path that was searched.
 */
export function makeProjectVersionMissingError(
  filePath: string
): ProjectVersionMissingError {
  return new FileMissingError("ProjectVersion.txt", filePath);
}

/**
 * Error for when the project version could not be parsed.
 */
export type ProjectVersionParseError = FileParseError<"ProjectVersion.txt">;

/**
 * Makes a {@link ProjectVersionParseError} object.
 * @param filePath The path of the file.
 */
export function makeProjectVersionParseError(
  filePath: string
): ProjectVersionParseError {
  return new FileParseError(filePath, "ProjectVersion.txt");
}

/**
 * Error which may occur when loading a project-version.
 */
export type ProjectVersionLoadError =
  | ProjectVersionMissingError
  | GenericIOError
  | StringFormatError<"Yaml">
  | ProjectVersionParseError;

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
export function makeLoadProjectVersion(
  readFile: ReadTextFile
): LoadProjectVersion {
  return (projectDirPath) => {
    const filePath = projectVersionTxtPathFor(projectDirPath);

    return new AsyncResult(
      Result.wrapAsync<string | null, GenericIOError>(() =>
        readFile(filePath, true)
      )
    )
      .andThen((maybeContent) =>
        maybeContent !== null
          ? Ok(maybeContent)
          : Err(makeProjectVersionMissingError(filePath))
      )
      .map(tryParseYaml)
      .andThen((content) => {
        if (
          !(
            typeof content === "object" &&
            content !== null &&
            "m_EditorVersion" in content &&
            typeof content.m_EditorVersion === "string"
          )
        )
          return Err(makeProjectVersionParseError(filePath));

        return Ok(content.m_EditorVersion);
      });
  };
}
