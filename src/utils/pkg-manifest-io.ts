import fs from "fs";
import { assertIsError } from "./error-type-guards";
import log from "../logger";
import { env } from "./env";
import { PkgManifest } from "../types/pkg-manifest";

/**
 * Attempts to load the manifest from the path specified in env
 */
export const loadManifest = function (): PkgManifest | null {
  try {
    const text = fs.readFileSync(env.manifestPath, { encoding: "utf8" });
    return JSON.parse(text);
  } catch (err) {
    assertIsError(err);
    if (err.code == "ENOENT")
      log.error("manifest", "file Packages/manifest.json does not exist");
    else {
      log.error(
        "manifest",
        `failed to parse Packages/manifest.json at ${env.manifestPath}`
      );
      log.error("manifest", err.message);
    }
    return null;
  }
};

/**
 * Save manifest json file to the path specified in env
 */
export const saveManifest = function (data: PkgManifest) {
  const json = JSON.stringify(data, null, 2);
  try {
    fs.writeFileSync(env.manifestPath, json);
    return true;
  } catch (err) {
    assertIsError(err);
    log.error("manifest", "can not write manifest json file");
    log.error("manifest", err.message);
    return false;
  }
};
