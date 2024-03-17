import fs from "fs/promises";
import { assertIsError } from "./error-type-guards";
import {
  manifestPathFor,
  pruneManifest,
  UnityProjectManifest,
} from "../types/project-manifest";
import fse from "fs-extra";
import path from "path";
import { CustomError } from "ts-custom-error";
import { RequiredFileNotFoundError } from "../common-errors";
import { AsyncResult, Err, Ok, Result } from "ts-results-es";

export class ManifestParseError extends CustomError {
  constructor(readonly path: string, readonly cause: Error) {
    super("A project-manifest could not be parsed");
  }
}

export type ManifestLoadError = RequiredFileNotFoundError | ManifestParseError;

export type ManifestSaveError = Error;

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
        else return new ManifestParseError(manifestPath, error);
      })
  );
};

/**
 * Saves a Unity project manifest.
 * @param projectPath The path to the projects root directory.
 * @param manifest The manifest to save.
 */
export const trySaveProjectManifest = async function (
  projectPath: string,
  manifest: UnityProjectManifest
): Promise<Result<void, ManifestSaveError>> {
  const manifestPath = manifestPathFor(projectPath);
  manifest = pruneManifest(manifest);
  const json = JSON.stringify(manifest, null, 2);
  try {
    await fse.ensureDir(path.dirname(manifestPath));
    await fs.writeFile(manifestPath, json);
    return Ok(undefined);
  } catch (error) {
    assertIsError(error);
    return Err(error);
  }
};
