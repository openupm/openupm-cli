import { EOL } from "node:os";
import path from "path";
import { Npmrc } from "../domain/npmrc";
import { GetHomePath, getHomePathFromEnv } from "./special-paths";
import { readTextFile, ReadTextFile, WriteTextFile } from "./text-file-io";

/**
 * Function for determining the path of the users .npmrc file.
 * @returns The path to the file.
 */
export type FindNpmrcPath = () => string;

/**
 * Makes a {@link FindNpmrcPath} function which resolves the path to the
 * `.npmrc` file that is stored in the users home directory.
 */
export function FindNpmrcInHome(getHomePath: GetHomePath): FindNpmrcPath {
  return () => {
    const homePath = getHomePath();
    return path.join(homePath, ".npmrc");
  };
}

/**
 * Default {@link FindNpmrcPath} function. Uses {@link FindNpmrcInHome}.
 */
export const findNpmrcPath: FindNpmrcPath = FindNpmrcInHome(getHomePathFromEnv);

/**
 * Function for loading npmrc.
 * @param path The path to load from.
 * @returns The npmrc's lines or null if not found.
 */
export type LoadNpmrc = (path: string) => Promise<Npmrc | null>;

/**
 * Makes a {@link LoadNpmrc} function which reads the content of a `.npmrc`
 * file.
 */
export function ReadNpmrcFile(readFile: ReadTextFile): LoadNpmrc {
  return (path) =>
    readFile(path, true).then((content) => content?.split(EOL) ?? null);
}

/**
 * Default {@link LoadNpmrc} function. Uses {@link ReadNpmrcFile}.
 */
export const loadNpmrc = ReadNpmrcFile(readTextFile);

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
    return await writeFile(path, content);
  };
}
