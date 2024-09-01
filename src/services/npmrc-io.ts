import { EOL } from "node:os";
import { Npmrc } from "../domain/npmrc";
import { splitLines } from "../utils/string-utils";
import { ReadTextFile, WriteTextFile } from "../io/text-file-io";

/**
 * Attempts to load the `.npmrc` file at a given path.
 * @param readFile IO function with which to read the file.
 * @param path The path of the file.
 * @returns The file content or null if not found.
 */
export async function tryLoadNpmrcUsing(
  readFile: ReadTextFile,
  path: string
): Promise<Npmrc | null> {
  return readFile(path, true).then((content) =>
    content !== null
      ? // TODO: Check if lines are valid.
        splitLines(content)
      : null
  );
}

/**
 * Function for saving npmrc files. Overwrites the content of the file.
 * @param writeFile IO function to use for writing the file.
 * @param path The path to the file.
 * @param npmrc The new lines for the file.
 */
export async function saveNpmrcUsing(
  writeFile: WriteTextFile,
  path: string,
  npmrc: Npmrc
): Promise<void> {
  const content = npmrc.join(EOL);
  return await writeFile(path, content);
}
