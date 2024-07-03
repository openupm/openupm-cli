import path from "path";
import { ReadTextFile } from "./text-file-io";
import { tryParseYaml } from "../utils/string-parsing";
import { FileMissingError, FileParseError } from "./common-errors";

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
 * Function for loading a projects editor version string.
 * @param projectDirPath The path to the projects root directory.
 * @returns A string describing the projects editor version ie 2020.2.1f1.
 */
export type LoadProjectVersion = (projectDirPath: string) => Promise<string>;

/**
 * Makes a {@link LoadProjectVersion} function.
 */
export function makeLoadProjectVersion(
  readFile: ReadTextFile
): LoadProjectVersion {
  return async (projectDirPath) => {
    const filePath = projectVersionTxtPathFor(projectDirPath);

    const content = await readFile(filePath, true);
    if (content === null) throw makeProjectVersionMissingError(filePath);

    const yaml = tryParseYaml(content);

    if (
      !(
        typeof yaml === "object" &&
        yaml !== null &&
        "m_EditorVersion" in yaml &&
        typeof yaml.m_EditorVersion === "string"
      )
    )
      throw makeProjectVersionParseError(filePath);

    return yaml.m_EditorVersion;
  };
}
