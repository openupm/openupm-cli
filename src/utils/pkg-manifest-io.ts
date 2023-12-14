import fs from "fs";
import { assertIsError } from "./error-type-guards";
import log from "../logger";
import { PkgManifest } from "../types/pkg-manifest";

/**
 * Attempts to load the manifest from the path specified in env
 * @param path The path where the manifest is located
 */
export const loadManifest = function (path: string): PkgManifest | null {
  try {
    const text = fs.readFileSync(path, { encoding: "utf8" });
    return JSON.parse(text);
  } catch (err) {
    assertIsError(err);
    if (err.code == "ENOENT")
      log.error("manifest", "file Packages/manifest.json does not exist");
    else {
      log.error(
        "manifest",
        `failed to parse Packages/manifest.json at ${path}`
      );
      log.error("manifest", err.message);
    }
    return null;
  }
};

/**
 * Save manifest json file to the path specified in enva
 * @param path The path where the manifest is located
 * @param data The manifest to save
 */
export const saveManifest = function (path: string, data: PkgManifest) {
  const json = JSON.stringify(data, null, 2);
  try {
    fs.writeFileSync(path, json);
    return true;
  } catch (err) {
    assertIsError(err);
    log.error("manifest", "can not write manifest json file");
    log.error("manifest", err.message);
    return false;
  }
};
