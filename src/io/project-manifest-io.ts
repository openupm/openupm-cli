import {
  pruneManifest,
  UnityProjectManifest,
} from "../domain/project-manifest";
import path from "path";
import { FileParseError } from "../common-errors";
import { AsyncResult } from "ts-results-es";
import { FsError, NotFoundError, ReadTextFile, WriteTextFile } from "./file-io";
import { tryParseJson } from "../utils/string-parsing";

/**
 * Determines the path to the package manifest based on the project
 * directory.
 * @param projectPath The root path of the Unity project.
 */
export function manifestPathFor(projectPath: string): string {
  return path.join(projectPath, "Packages/manifest.json");
}

/**
 * Error which may occur when loading a project manifest.
 */
export type ManifestLoadError = NotFoundError | FileParseError;

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
export function makeProjectManifestLoader(
  readFile: ReadTextFile
): LoadProjectManifest {
  return (projectPath) => {
    const manifestPath = manifestPathFor(projectPath);
    return (
      readFile(manifestPath)
        .andThen(tryParseJson)
        // TODO: Actually validate the json structure
        .map((json) => json as unknown as UnityProjectManifest)
        .mapErr((error) => {
          if (error instanceof NotFoundError) return error;
          return new FileParseError(manifestPath, "Project-manifest");
        })
    );
  };
}

/**
 * Error which may occur when saving a project manifest.
 */
export type ManifestWriteError = FsError;

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
export function makeProjectManifestWriter(
  writeFile: WriteTextFile
): WriteProjectManifest {
  return (projectPath, manifest) => {
    const manifestPath = manifestPathFor(projectPath);
    manifest = pruneManifest(manifest);
    const json = JSON.stringify(manifest, null, 2);

    return writeFile(manifestPath, json);
  };
}
