import {
  pruneManifest,
  UnityProjectManifest,
} from "../domain/project-manifest";
import path from "path";
import { ReadTextFile, WriteTextFile } from "./text-file-io";
import { tryParseJson } from "../utils/string-parsing";
import { FileMissingError, FileParseError } from "./common-errors";

/**
 * Determines the path to the package manifest based on the project
 * directory.
 * @param projectPath The root path of the Unity project.
 */
export function manifestPathFor(projectPath: string): string {
  return path.join(projectPath, "Packages/manifest.json");
}

/**
 * Error for when the project manifest is missing.
 */
export type ProjectManifestMissingError = FileMissingError<"ProjectManifest">;

/**
 * Makes a new {@link ProjectManifestMissingError}.
 * @param filePath The path that was searched.
 */
export function makeProjectManifestMissingError(
  filePath: string
): ProjectManifestMissingError {
  return new FileMissingError("ProjectManifest", filePath);
}

/**
 * Error for when the project manifest could not be parsed.
 */
export type ProjectManifestParseError = FileParseError<"ProjectManifest">;

/**
 * Makes a {@link ProjectManifestParseError} object.
 * @param filePath The path of the file.
 */
export function makeProjectManifestParseError(
  filePath: string
): ProjectManifestParseError {
  return new FileParseError(filePath, "ProjectManifest");
}

/**
 * Function for loading the project manifest for a Unity project.
 * @param projectPath The path to the project's directory.
 * @returns The loaded manifest.
 */
export type LoadProjectManifest = (
  projectPath: string
) => Promise<UnityProjectManifest>;

/**
 * Makes a {@link LoadProjectManifest} function.
 */
export function makeLoadProjectManifest(
  readFile: ReadTextFile
): LoadProjectManifest {
  return (projectPath) => {
    const manifestPath = manifestPathFor(projectPath);
    return readFile(manifestPath, true)
      .then((maybeContent) => {
        if (maybeContent === null)
          throw makeProjectManifestMissingError(manifestPath);
        return maybeContent;
      })
      .then(tryParseJson)
      .then((json) => {
        if (typeof json === "object")
          // TODO: Actually validate the json structure
          return json as unknown as UnityProjectManifest;
        throw makeProjectManifestParseError(manifestPath);
      });
  };
}

/**
 * Function for replacing the project manifest for a Unity project.
 * @param projectPath The path to the project's directory.
 * @param manifest The manifest to write to the project.
 */
export type WriteProjectManifest = (
  projectPath: string,
  manifest: UnityProjectManifest
) => Promise<void>;

/**
 * Makes a {@link WriteProjectManifest} function.
 */
export function makeWriteProjectManifest(
  writeFile: WriteTextFile
): WriteProjectManifest {
  return async (projectPath, manifest) => {
    const manifestPath = manifestPathFor(projectPath);
    manifest = pruneManifest(manifest);
    const json = JSON.stringify(manifest, null, 2);

    return await writeFile(manifestPath, json);
  };
}
