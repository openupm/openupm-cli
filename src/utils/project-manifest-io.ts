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
import { Result } from "@badrap/result";
import { CustomError } from "ts-custom-error";
import { RequiredFileNotFoundError } from "../common-errors";
import err = Result.err;
import ok = Result.ok;

export class ManifestParseError extends CustomError {}

export type ManifestLoadError = RequiredFileNotFoundError | ManifestParseError;

export type ManifestSaveError = Error;

export type ManifestLoadResult = Result<
  UnityProjectManifest,
  ManifestLoadError
>;

export type ManifestSaveResult = Result<void, ManifestSaveError>;

/**
 * Attempts to load the manifest for a Unity project.
 * @param projectPath The path to the root of the project.
 */
export const tryLoadProjectManifest = async function (
  projectPath: string
): Promise<ManifestLoadResult> {
  const manifestPath = manifestPathFor(projectPath);
  try {
    const text = await fs.readFile(manifestPath, { encoding: "utf8" });
    // TODO: Actually validate the content of the file
    return ok(JSON.parse(text) as UnityProjectManifest);
  } catch (error) {
    assertIsError(error);
    if (error.code === "ENOENT") {
      log.error("manifest", `manifest at ${manifestPath} does not exist`);
      return err(new RequiredFileNotFoundError(manifestPath));
    } else {
      log.error("manifest", `failed to parse manifest at ${manifestPath}`);
      log.error("manifest", error.message);
      return err(new ManifestParseError());
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
): Promise<ManifestSaveResult> {
  const manifestPath = manifestPathFor(projectPath);
  manifest = pruneManifest(manifest);
  const json = JSON.stringify(manifest, null, 2);
  try {
    await fse.ensureDir(path.dirname(manifestPath));
    await fs.writeFile(manifestPath, json);
    return ok(undefined);
  } catch (error) {
    assertIsError(error);
    log.error("manifest", "can not write manifest json file");
    log.error("manifest", error.message);
    return err(error);
  }
};
