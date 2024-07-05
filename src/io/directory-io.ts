import fs from "fs/promises";

/**
 * Attempts to get the names of all directories in a directory.
 * @param directoryPath The directories name.
 * TODO: Convert to service function.
 */
export async function tryGetDirectoriesIn(
  directoryPath: string
): Promise<ReadonlyArray<string>> {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const directories = entries.filter((it) => it.isDirectory());
  return directories.map((it) => it.name);
}
