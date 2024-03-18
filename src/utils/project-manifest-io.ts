import fs from "fs/promises";
import { assertIsError } from "./error-type-guards";
import { pruneManifest, UnityProjectManifest } from "../types/project-manifest";
import fse from "fs-extra";
import path from "path";
import { FileParseError, RequiredFileNotFoundError } from "../common-errors";
import { AsyncResult, Result } from "ts-results-es";

export type ManifestLoadError = RequiredFileNotFoundError | FileParseError;

export type ManifestSaveError = Error;

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
    new AsyncResult(
      Result.wrapAsync(() => fs.readFile(manifestPath, { encoding: "utf8" }))
    )
      // TODO: Actually validate the content of the file
      .andThen((text) =>
        Result.wrap(() => JSON.parse(text) as UnityProjectManifest)
      )
      .mapErr((error) => {
        assertIsError(error);
        if (error.code === "ENOENT")
          return new RequiredFileNotFoundError(manifestPath);
        else return new FileParseError(manifestPath, "Project-manifest");
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

  return new AsyncResult(
    Result.wrapAsync(async () => {
      await fse.ensureDir(path.dirname(manifestPath));
      await fs.writeFile(manifestPath, json);
    })
  );
};
