import { AnyJson } from "@iarna/toml";
import path from "path";
import { CustomError } from "ts-custom-error";
import * as YAML from "yaml";
import { DebugLog, npmDebugLog } from "../logging";
import { assertIsError } from "../utils/error-type-guards";
import { readTextFile, ReadTextFile } from "./text-file-io";

export class ProjectVersionMissingError extends CustomError {
  public constructor(public readonly expectedPath: string) {
    super();
  }
}

export class ProjectVersionMalformedError extends CustomError {}

/**
 * Constructs the path to a ProjectVersion.txt file based on the path to
 * the containing project directory.
 * @param projectDirPath The path to the project directory.
 * @returns The path to the version file.
 */
export function projectVersionTxtPathFor(projectDirPath: string) {
  return path.join(projectDirPath, "ProjectSettings", "ProjectVersion.txt");
}

/**
 * Function for getting a projects editor version string.
 * @param projectDirPath The path to the projects root directory.
 * @returns A string describing the projects editor version ie 2020.2.1f1.
 */
export type GetProjectVersion = (projectDirPath: string) => Promise<string>;

/**
 * Makes a {@link GetProjectVersion} function which gets the project-version
 * from the `ProjectSettings/ProjectVersion.txt` file.
 */
export function ReadProjectVersionFile(
  readFile: ReadTextFile,
  debugLog: DebugLog
): GetProjectVersion {
  return async (projectDirPath) => {
    const filePath = projectVersionTxtPathFor(projectDirPath);

    const content = await readFile(filePath, true);
    if (content === null) throw new ProjectVersionMissingError(filePath);

    let yaml: AnyJson;
    try {
      yaml = YAML.parse(content);
    } catch (error) {
      assertIsError(error);
      debugLog("ProjectVersion.txt has malformed yaml.", error);
      throw new ProjectVersionMalformedError();
    }

    if (
      !(
        typeof yaml === "object" &&
        yaml !== null &&
        "m_EditorVersion" in yaml &&
        typeof yaml.m_EditorVersion === "string"
      )
    )
      throw new ProjectVersionMalformedError();

    return yaml.m_EditorVersion;
  };
}

/**
 * Default {@link GetProjectVersion} function. Uses {@link ReadProjectVersionFile}.
 */
export const getProjectVersion = ReadProjectVersionFile(
  readTextFile,
  npmDebugLog
);
