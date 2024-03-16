import fs from "fs/promises";
import { assertIsError } from "./error-type-guards";
import log from "../logger";
import {
  manifestPathFor,
  pruneManifest,
  UnityProjectManifest,
} from "../types/project-manifest";
import fse from "fs-extra";
import path from "path";
import { CustomError } from "ts-custom-error";
import { RequiredFileNotFoundError } from "../common-errors";
import { Err, Ok, Result } from "ts-results-es";

export class ManifestParseError extends CustomError {}

export type ManifestLoadError = RequiredFileNotFoundError | ManifestParseError;

export type ManifestSaveError = Error;

/**
 * Attempts to load the manifest for a Unity project.
 * @param projectPath The path to the root of the project.
 */
export const tryLoadProjectManifest = async function (
  projectPath: string
): Promise<Result<UnityProjectManifest, ManifestLoadError>> {
  const manifestPath = manifestPathFor(projectPath);
  try {
    const text = await fs.readFile(manifestPath, { encoding: "utf8" });
    // TODO: Actually validate the content of the file
    return Ok(JSON.parse(text) as UnityProjectManifest);
  } catch (error) {
    assertIsError(error);
    if (error.code === "ENOENT")
      return Err(new RequiredFileNotFoundError(manifestPath));
    else {
      log.error("manifest", `failed to parse manifest at ${manifestPath}`);
      log.error("manifest", error.message);
      return Err(new ManifestParseError());
    }
  }
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
    log.error("manifest", "can not write manifest json file");
    log.error("manifest", error.message);
    return Err(error);
  }
};
