import { CustomError } from "ts-custom-error";
import {
  manifestPathFor,
  parseProjectManifest,
  UnityProjectManifest,
} from "../domain/project-manifest";
import { DebugLog } from "../logging";
import { assertIsError } from "../utils/error-type-guards";
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
 * Function for loading the project manifest for a Unity project.
 * @param projectPath The path to the project's directory.
 * @returns The loaded manifest.
 */
export type LoadProjectManifest = (
  projectPath: string
) => Promise<UnityProjectManifest>;

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

    const content = await readFile(manifestPath);
    if (content === null) throw new ManifestMissingError(manifestPath);

    try {
      return parseProjectManifest(content);
    } catch (error) {
      assertIsError(error);
      debugLog("Manifest parse failed because of invalid json content.", error);
      throw new ManifestMalformedError();
    }
  };
}

/**
 * Default {@link LoadProjectManifest} function. Uses {@link ReadProjectManifestFile}.
 */
export const loadProjectManifestUsing = (debugLog: DebugLog) =>
  ReadProjectManifestFile(readTextFile, debugLog);

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
