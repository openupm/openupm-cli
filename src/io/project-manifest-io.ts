import {
  pruneManifest,
  UnityProjectManifest,
} from "../domain/project-manifest";
import path from "path";
import { FileParseError } from "../common-errors";
import { AsyncResult } from "ts-results-es";
import {
  IOError,
  NotFoundError,
  tryReadTextFromFile,
  tryWriteTextToFile,
} from "./file-io";
import { tryParseJson } from "../utils/data-parsing";

export type ManifestSaveError = IOError;

/**
 * Determines the path to the package manifest based on the project
 * directory.
 * @param projectPath The root path of the Unity project.
 */
export function manifestPathFor(projectPath: string): string {
  return path.join(projectPath, "Packages/manifest.json");
}

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
export function makeProjectManifestLoader(): LoadProjectManifest {
  return (projectPath) => {
    const manifestPath = manifestPathFor(projectPath);
    return (
      tryReadTextFromFile(manifestPath)
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
 * Saves a Unity project manifest.
 * @param projectPath The path to the projects root directory.
 * @param manifest The manifest to save.
 */
export const trySaveProjectManifest = function (
  projectPath: string,
  manifest: UnityProjectManifest
): AsyncResult<void, ManifestSaveError> {
  const manifestPath = manifestPathFor(projectPath);
  manifest = pruneManifest(manifest);
  const json = JSON.stringify(manifest, null, 2);

  return tryWriteTextToFile(manifestPath, json);
};
