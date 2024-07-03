import { ReadTextFile, WriteTextFile } from "./text-file-io";
import { EOL } from "node:os";
import { Npmrc } from "../domain/npmrc";
import path from "path";
import { GetHomePath } from "./special-paths";
import { GenericIOError } from "./common-errors";

/**
 * Function for determining the path of the users .npmrc file.
 * @returns The path to the file.
 */
export type FindNpmrcPath = () => string;

/**
 * Makes a {@link FindNpmrcPath} function.
 */
export function makeFindNpmrcPath(getHomePath: GetHomePath): FindNpmrcPath {
  return () => {
    const homePath = getHomePath();
    return path.join(homePath, ".npmrc");
  };
}

/**
 * Function for loading npmrc.
 * @param path The path to load from.
 * @returns The npmrc's lines or null if not found.
 */
export type LoadNpmrc = (path: string) => Promise<Npmrc | null>;

/**
 * Makes a {@link LoadNpmrc} function.
 */
export function makeLoadNpmrc(readFile: ReadTextFile): LoadNpmrc {
  return (path) =>
    readFile(path, true).then((content) => content?.split(EOL) ?? null);
}

/**
 * Function for saving npmrc files. Overwrites the content of the file.
 * @param path The path to the file.
 * @param npmrc The new lines for the file.
 */
export type SaveNpmrc = (path: string, npmrc: Npmrc) => Promise<void>;

/**
 * Makes a {@link SaveNpmrc} function.
 */
export function makeSaveNpmrc(writeFile: WriteTextFile): SaveNpmrc {
  return async (path, npmrc) => {
    const content = npmrc.join(EOL);
    try {
      return await writeFile(path, content);
    } catch {
      throw new GenericIOError("Write");
    }
  };
}
