import { AnyJson } from "@iarna/toml";
import path from "path";
import { CustomError } from "ts-custom-error";
import * as YAML from "yaml";
import { z } from "zod";
import { DebugLog } from "../logging";
import { assertIsError } from "../utils/error-type-guards";
import { isZod } from "../utils/zod-utils";
import { ReadTextFile } from "./text-file-io";

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

const projectVersionTxtSchema = z.object({ m_EditorVersion: z.string() });

/**
 * Function for getting a projects editor version string.
 * @param readFile IO function for reading the version file.
 * @param debugLog Logging function for debug messages.
 * @param projectDirPath The path to the projects root directory.
 * @returns A string describing the projects editor version ie 2020.2.1f1.
 */
export async function loadProjectVersionUsing(
  readFile: ReadTextFile,
  debugLog: DebugLog,
  projectDirPath: string
): Promise<string> {
  const filePath = projectVersionTxtPathFor(projectDirPath);

  const content = await readFile(filePath);
  if (content === null) throw new ProjectVersionMissingError(filePath);

  let yaml: AnyJson;
  try {
    yaml = YAML.parse(content);
  } catch (error) {
    assertIsError(error);
    debugLog("ProjectVersion.txt has malformed yaml.", error);
    throw new ProjectVersionMalformedError();
  }

  if (!isZod(yaml, projectVersionTxtSchema))
    throw new ProjectVersionMalformedError();

  return yaml.m_EditorVersion;
}
