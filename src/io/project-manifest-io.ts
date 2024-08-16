import { AnyJson } from "@iarna/toml";
import path from "path";
import { CustomError } from "ts-custom-error";
import { z } from "zod";
import { UnityProjectManifest } from "../domain/project-manifest";
import { DebugLog, npmDebugLog } from "../logging";
import { assertIsError } from "../utils/error-type-guards";
import { isZod } from "../utils/zod-utils";
import {
  readTextFile,
  ReadTextFile,
  writeTextFile,
  WriteTextFile,
} from "./text-file-io";

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

// TODO: Add a better schema
const projectManifestSchema = z.object({});

/**
 * Makes a {@link LoadProjectManifest} function which reads the content
 * of a `manifest.json` file.
 */
export function ReadProjectManifestFile(
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

    if (!isZod(json, projectManifestSchema)) throw new ManifestMalformedError();

    return json as unknown as UnityProjectManifest;
  };
}

/**
 * Default {@link LoadProjectManifest} function. Uses {@link ReadProjectManifestFile}.
 */
export const loadProjectManifest: LoadProjectManifest = ReadProjectManifestFile(
  readTextFile,
  npmDebugLog
);

/**
 * Function for replacing the project manifest for a Unity project.
 * @param projectPath The path to the project's directory.
 * @param manifest The manifest to write to the project.
 */
export type SaveProjectManifest = (
  projectPath: string,
  manifest: UnityProjectManifest
) => Promise<void>;

/**
 * Serializes a {@link UnityProjectManifest} object into json format.
 * @param manifest The manifest to serialize.
 * @returns The serialized manifest.
 */
export function serializeProjectManifest(
  manifest: UnityProjectManifest
): string {
  // Remove empty scoped registries
  if (manifest.scopedRegistries !== undefined)
    manifest = {
      ...manifest,
      scopedRegistries: manifest.scopedRegistries.filter(
        (it) => it.scopes.length > 0
      ),
    };

  return JSON.stringify(manifest, null, 2);
}

/**
 * Makes a {@link SaveProjectManifest} function which overwrites the contents
 * of a `manifest.json` file.
 */
export function WriteProjectManifestFile(
  writeFile: WriteTextFile
): SaveProjectManifest {
  return async (projectPath, manifest) => {
    const manifestPath = manifestPathFor(projectPath);
    const content = serializeProjectManifest(manifest);
    return await writeFile(manifestPath, content);
  };
}

/**
 * Default {@link SaveProjectManifest} function. Uses {@link WriteProjectManifestFile}.
 */
export const saveProjectManifest: SaveProjectManifest =
  WriteProjectManifestFile(writeTextFile);
