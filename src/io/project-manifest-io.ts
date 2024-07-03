import {
  pruneManifest,
  UnityProjectManifest,
} from "../domain/project-manifest";
import path from "path";
import { AsyncResult, Err, Ok, Result } from "ts-results-es";
import { ReadTextFile, WriteTextFile } from "./text-file-io";
import { StringFormatError, tryParseJson } from "../utils/string-parsing";
import {
  FileMissingError,
  FileParseError,
  GenericIOError,
} from "./common-errors";
import { assertIsNodeError } from "../utils/error-type-guards";

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
 * Error which may occur when loading a project manifest.
 */
export type ManifestLoadError =
  | ProjectManifestMissingError
  | StringFormatError<"Json">
  | GenericIOError
  | ProjectManifestParseError;

/**
 * Function for loading the project manifest for a Unity project.
 * @param projectPath The path to the project's directory.
 */
export type LoadProjectManifest = (
  projectPath: string
) => AsyncResult<UnityProjectManifest, ManifestLoadError>;

/**
 * Makes a {@link LoadProjectManifest} function.
 */
export function makeLoadProjectManifest(
  readFile: ReadTextFile
): LoadProjectManifest {
  return (projectPath) => {
    const manifestPath = manifestPathFor(projectPath);
    return new AsyncResult(
      Result.wrapAsync(() => readFile(manifestPath, false))
    )
      .mapErr((error) => {
        assertIsNodeError(error);
        return error.code === "ENOENT"
          ? makeProjectManifestMissingError(manifestPath)
          : new GenericIOError("Read");
      })
      .andThen(tryParseJson)
      .andThen((json) =>
        typeof json === "object"
          ? // TODO: Actually validate the json structure
            Ok(json as unknown as UnityProjectManifest)
          : Err(makeProjectManifestParseError(manifestPath))
      );
  };
}

/**
 * Error which may occur when saving a project manifest.
 */
export type ManifestWriteError = never;

/**
 * Function for replacing the project manifest for a Unity project.
 * @param projectPath The path to the project's directory.
 * @param manifest The manifest to write to the project.
 */
export type WriteProjectManifest = (
  projectPath: string,
  manifest: UnityProjectManifest
) => AsyncResult<void, ManifestWriteError>;

/**
 * Makes a {@link WriteProjectManifest} function.
 */
export function makeWriteProjectManifest(
  writeFile: WriteTextFile
): WriteProjectManifest {
  return (projectPath, manifest) => {
    const manifestPath = manifestPathFor(projectPath);
    manifest = pruneManifest(manifest);
    const json = JSON.stringify(manifest, null, 2);

    return new AsyncResult(
      Result.wrapAsync(() => writeFile(manifestPath, json))
    );
  };
}
