import { DebugLog } from "../logging";
import fs from "fs/promises";
import { assertIsNodeError } from "../utils/error-type-guards";

/**
 * Attempts to get the names of all directories in a directory.
 * @param directoryPath The directories name.
 * @param debugLog Debug-log function.
 * TODO: Convert to service function.
 */
export async function tryGetDirectoriesIn(
  directoryPath: string,
  debugLog: DebugLog
): Promise<ReadonlyArray<string>> {
  try {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const directories = entries.filter((it) => it.isDirectory());
    return directories.map((it) => it.name);
  } catch (error) {
    assertIsNodeError(error);
    debugLog("Failed to get directories", error);
    throw error;
  }
}
