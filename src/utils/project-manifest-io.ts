import fs from "fs";
import { assertIsError } from "./error-type-guards";
import log from "../logger";
import {
  manifestPathFor,
  UnityProjectManifest,
} from "../types/project-manifest";
import fse from "fs-extra";
import path from "path";

/**
 * Attempts to load the manifest from the path specified in env
 * @param workingDirectory The working directory
 */
export function loadProjectManifest(
  workingDirectory: string
): UnityProjectManifest | null {
  const manifestPath = manifestPathFor(workingDirectory);
  try {
    const text = fs.readFileSync(manifestPath, { encoding: "utf8" });
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
}

/**
 * Save manifest json file to the path specified in env
 * @param workingDirectory The working directory
 * @param data The manifest to save
 */
export function saveProjectManifest(
  workingDirectory: string,
  data: UnityProjectManifest
) {
  const manifestPath = manifestPathFor(workingDirectory);
  const json = JSON.stringify(data, null, 2);
  try {
    fse.ensureDirSync(path.dirname(manifestPath));
    fs.writeFileSync(manifestPath, json);
    return true;
  } catch (err) {
    assertIsError(err);
    log.error("manifest", "can not write manifest json file");
    log.error("manifest", err.message);
    return false;
  }
}
