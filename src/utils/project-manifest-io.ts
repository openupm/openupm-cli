import fs from "fs/promises";
import { assertIsError } from "./error-type-guards";
import log from "../logger";
import {
  manifestPathFor,
  UnityProjectManifest,
} from "../types/project-manifest";
import fse from "fs-extra";
import path from "path";

/**
 * Attempts to load the manifest for a Unity project.
 * @param projectPath The path to the root of the project.
 */
export const loadProjectManifest = async function (
  projectPath: string
): Promise<UnityProjectManifest | null> {
  const manifestPath = manifestPathFor(projectPath);
  try {
    const text = await fs.readFile(manifestPath, { encoding: "utf8" });
    return JSON.parse(text);
  } catch (err) {
    assertIsError(err);
    if (err.code == "ENOENT")
      log.error("manifest", `manifest at ${manifestPath} does not exist`);
    else {
      log.error("manifest", `failed to parse manifest at ${manifestPath}`);
      log.error("manifest", err.message);
    }
    return null;
  }
};

/**
 * Saves a Unity project manifest.
 * @param projectPath The path to the projects root directory.
 * @param data The manifest to save.
 */
export const saveProjectManifest = async function (
  projectPath: string,
  data: UnityProjectManifest
) {
  const manifestPath = manifestPathFor(projectPath);
  const json = JSON.stringify(data, null, 2);
  try {
    await fse.ensureDir(path.dirname(manifestPath));
    await fs.writeFile(manifestPath, json);
    return true;
  } catch (err) {
    assertIsError(err);
    log.error("manifest", "can not write manifest json file");
    log.error("manifest", err.message);
    return false;
  }
};
