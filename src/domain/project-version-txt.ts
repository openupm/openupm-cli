import path from "path";
import * as YAML from "yaml";
import { z } from "zod";
import {
  isRelease,
  tryParseEditorVersion,
  type ReleaseVersion,
} from "./editor-version";

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
 * Attempts to extract the project version from the content of a
 * `ProjectVersion.txt` file.
 * @param content The file content.
 * @returns The project version string.
 * @throws {YAML.YAMLError} If content is not valid yaml.
 * @throws {import("zod").ZodError} If content has incorrect shape.
 */
export function tryParseProjectVersionTxt(content: string) {
  const yaml = YAML.parse(content);
  return projectVersionTxtSchema.parse(yaml).m_EditorVersion;
}

/**
 * Validates the content of a ProjectVersion.txt file. It should be a
 * {@link ReleaseVersion}.
 * @param unparsedEditorVersion The unvalidated version.
 * @returns Either the validated release version or the original string
 * if not a valid release version.
 */
export function validateProjectVersion(
  unparsedEditorVersion: string
): ReleaseVersion | string {
  const parsedEditorVersion = tryParseEditorVersion(unparsedEditorVersion);
  return parsedEditorVersion !== null && isRelease(parsedEditorVersion)
    ? parsedEditorVersion
    : unparsedEditorVersion;
}
