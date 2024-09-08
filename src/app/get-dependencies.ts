import { CustomError } from "ts-custom-error";
import { assertIsError } from "../domain/error-type-guards";
import type { DebugLog } from "../domain/logging";
import {
  type UnityProjectManifest,
  manifestPathFor,
  parseProjectManifest,
} from "../domain/project-manifest";
import type { ReadTextFile } from "../io/text-file-io";

export class ManifestMissingError extends CustomError {
  public constructor(public expectedPath: string) {
    super();
  }
}

export class ManifestMalformedError extends CustomError {}

/**
 * Function for loading the project manifest for a Unity project.
 * @param readFile IO function for reading the manifest file.
 * @param debugLog Logger for printing debug messages.
 * @param projectPath The path to the project's directory.
 * @returns The loaded manifest.
 */
export async function loadProjectManifestUsing(
  readFile: ReadTextFile,
  debugLog: DebugLog,
  projectPath: string
): Promise<UnityProjectManifest> {
  const manifestPath = manifestPathFor(projectPath);
  const content = await readFile(manifestPath);
  if (content === null) throw new ManifestMissingError(manifestPath);
  try {
    return parseProjectManifest(content);
  } catch (error) {
    assertIsError(error);
    await debugLog(
      "Manifest parse failed because of invalid json content.",
      error
    );
    throw new ManifestMalformedError();
  }
}
