import { pruneManifest, UnityProjectManifest } from "../types/project-manifest";
import path from "path";
import { FileParseError, IOError } from "../common-errors";
import { AsyncResult } from "ts-results-es";
import {
  NotFoundError,
  tryReadTextFromFile,
  tryWriteTextToFile,
} from "./file-io";
import { tryParseJson } from "../utils/data-parsing";

export type ManifestLoadError = NotFoundError | FileParseError;

export type ManifestSaveError = IOError;

/**
 * Determines the path to the package manifest based on the project
 * directory.
 * @param projectPath The root path of the Unity project.
 */
export function manifestPathFor(projectPath: string): string {
  return path.join(projectPath, "Packages/manifest.json");
}

/**
 * Attempts to load the manifest for a Unity project.
 * @param projectPath The path to the root of the project.
 */
export const tryLoadProjectManifest = function (
  projectPath: string
): AsyncResult<UnityProjectManifest, ManifestLoadError> {
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
