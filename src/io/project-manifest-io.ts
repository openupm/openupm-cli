import {
  pruneManifest,
  UnityProjectManifest,
} from "../domain/project-manifest";
import path from "path";
import { ReadTextFile, WriteTextFile } from "./text-file-io";
import { AnyJson } from "@iarna/toml";
import { CustomError } from "ts-custom-error";
import { DebugLog } from "../logging";
import { assertIsError } from "../utils/error-type-guards";

export class ManifestMissingError extends CustomError {
  public constructor(public expectedPath: string) {
    super();
  }
}

export class ManifestMalformedError extends CustomError {}

/**
 * Determines the path to the package manifest based on the project
 * directory.
 * @param projectPath The root path of the Unity project.
 */
export function manifestPathFor(projectPath: string): string {
  return path.join(projectPath, "Packages/manifest.json");
}

/**
 * Function for loading the project manifest for a Unity project.
 * @param projectPath The path to the project's directory.
 * @returns The loaded manifest.
 */
export type LoadProjectManifest = (
  projectPath: string
) => Promise<UnityProjectManifest>;

/**
 * Makes a {@link LoadProjectManifest} function.
 */
export function makeLoadProjectManifest(
  readFile: ReadTextFile,
  debugLog: DebugLog
): LoadProjectManifest {
  return async (projectPath) => {
    const manifestPath = manifestPathFor(projectPath);

    const content = await readFile(manifestPath, true);
    if (content === null) throw new ManifestMissingError(manifestPath);

    let json: AnyJson;
    try {
      json = await JSON.parse(content);
    } catch (error) {
      assertIsError(error);
      debugLog("Manifest parse failed because of invalid json content.", error);
      throw new ManifestMalformedError();
    }

    // TODO: Actually validate the json structure
    if (typeof json !== "object") throw new ManifestMalformedError();

    return json as unknown as UnityProjectManifest;
  };
}

/**
 * Function for replacing the project manifest for a Unity project.
 * @param projectPath The path to the project's directory.
 * @param manifest The manifest to write to the project.
 */
export type WriteProjectManifest = (
  projectPath: string,
  manifest: UnityProjectManifest
) => Promise<void>;

/**
 * Makes a {@link WriteProjectManifest} function.
 */
export function makeWriteProjectManifest(
  writeFile: WriteTextFile
): WriteProjectManifest {
  return async (projectPath, manifest) => {
    const manifestPath = manifestPathFor(projectPath);
    manifest = pruneManifest(manifest);
    const json = JSON.stringify(manifest, null, 2);

    return await writeFile(manifestPath, json);
  };
}
