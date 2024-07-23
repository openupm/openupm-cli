import path from "path";
import { ReadTextFile } from "./text-file-io";
import * as YAML from "yaml";
import { CustomError } from "ts-custom-error";
import { AnyJson } from "@iarna/toml";
import { assertIsError } from "../utils/error-type-guards";
import { DebugLog } from "../logging";

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
 * Function for loading a projects editor version string.
 * @param projectDirPath The path to the projects root directory.
 * @returns A string describing the projects editor version ie 2020.2.1f1.
 */
export type LoadProjectVersion = (projectDirPath: string) => Promise<string>;

/**
 * Makes a {@link LoadProjectVersion} function.
 */
export function makeLoadProjectVersion(
  readFile: ReadTextFile,
  debugLog: DebugLog
): LoadProjectVersion {
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
