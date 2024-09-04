import fse from "fs-extra";
import fs from "fs/promises";
import path from "path";
import { assertIsNodeError } from "../utils/error-type-guards";

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
