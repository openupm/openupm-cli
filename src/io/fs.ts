import fse from "fs-extra";
import fs from "fs/promises";
import path from "path";
import { assertIsNodeError } from "../domain/error-type-guards";

/**
 * Function for loading the content of a text file.
 */
export type ReadTextFile =
  /**
   * @param path The path to the file.
   * @returns The files text content or null if file was missing.
   */
  (path: string) => Promise<string | null>;
/**
 * Makes a {@link ReadTextFile} function which reads from the file-system
 * using the {@link fs} module.
 */
export const readTextFile: ReadTextFile = ((path) =>
  fs.readFile(path, { encoding: "utf8" }).catch((error) => {
    assertIsNodeError(error);
    if (error.code === "ENOENT") return null;
    throw error;
  })) as ReadTextFile;

/**
 * Function for overwriting the content of a text file. Creates the file
 * if it does not exist.
 * @param filePath The path to the file.
 * @param content The content to write.
 */
export type WriteTextFile = (
  filePath: string,
  content: string
) => Promise<void>;

/**
 * Makes a {@link WriteTextFile} function which writes to the file-system
 * using the {@link fs} module.
 */
export const writeTextFile: WriteTextFile = async (filePath, content) => {
  const dirPath = path.dirname(filePath);
  await fse.ensureDir(dirPath);
  await fs.writeFile(filePath, content);
};

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
 * {@link GetDirectoriesIn} function which uses the real file-system.
 */
export const getDirectoriesInFs: GetDirectoriesIn = async (directoryPath) => {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const directories = entries.filter((it) => it.isDirectory());
  return directories.map((it) => it.name);
};
