import fs from "fs/promises";

/**
 * Attempts to get the names of all directories in a directory.
 * @param directoryPath The path of the directory to get directory names from.
 * @returns The names of the directories. That is, only the name and not whole
 * path.
 */
export type GetDirectoriesIn = (
  directoryPath: string
) => Promise<ReadonlyArray<string>>;

/**
 * Makes a {@link GetDirectoriesIn} function.
 */
export function makeGetDirectoriesIn(): GetDirectoriesIn {
  return async (directoryPath) => {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const directories = entries.filter((it) => it.isDirectory());
    return directories.map((it) => it.name);
  };
}
