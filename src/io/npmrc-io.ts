import { EOL } from "node:os";
import path from "path";
import { Npmrc } from "../domain/npmrc";
import { splitLines } from "../utils/string-utils";
import { ReadTextFile, writeTextFile, WriteTextFile } from "./text-file-io";

/**
 * Gets the `.npmrc` path for a user.
 * @param homePath The users home directory.
 * @returns The path to the `.npmrc` file.
 */
export const getHomeNpmrcPath = (homePath: string): string =>
  path.join(homePath, ".npmrc");

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
 * @param path The path to the file.
 * @param npmrc The new lines for the file.
 */
export type SaveNpmrc = (path: string, npmrc: Npmrc) => Promise<void>;

/**
 * Makes a {@link SaveNpmrc} function which overwrites the content of a
 * `.npmrc` file.
 */
export function WriteNpmrcPath(writeFile: WriteTextFile): SaveNpmrc {
  return async (path, npmrc) => {
    const content = npmrc.join(EOL);
    return await writeFile(path, content);
  };
}

/**
 * Default {@link SaveNpmrc} function. Uses {@link WriteNpmrcPath}.
 */
export const saveNpmrc = WriteNpmrcPath(writeTextFile);
