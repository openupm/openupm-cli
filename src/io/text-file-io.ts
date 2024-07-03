import fs from "fs/promises";
import { assertIsNodeError } from "../utils/error-type-guards";
import fse from "fs-extra";
import path from "path";
import { DebugLog } from "../logging";
import { GenericIOError } from "./common-errors";

/**
 * Function for loading the content of a text file.
 */
export type ReadTextFile = {
  /**
   * @param path The path to the file.
   * @param optional The file is expected to exist. Throws if not found.
   * @returns The files text content.
   */
  (path: string, optional: false): Promise<string>;
  /**
   * @param path The path to the file.
   * @param optional The file is expected to potentially not exist.
   * @returns The files text content or null if file was missing.
   */
  (path: string, optional: true): Promise<string | null>;
};

/**
 * Makes a {@link ReadTextFile} function.
 */
export function makeReadText(debugLog: DebugLog): ReadTextFile {
  return ((path, optional) =>
    fs.readFile(path, { encoding: "utf8" }).catch((error) => {
      assertIsNodeError(error);
      debugLog("Text file read failed.", error);
      if (optional && error.code === "ENOENT") return null;
      throw new GenericIOError("Read");
    })) as ReadTextFile;
}

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
 * Makes a {@link WriteTextFile} function.
 */
export function makeWriteText(debugLog: DebugLog): WriteTextFile {
  return async (filePath, content) => {
    const dirPath = path.dirname(filePath);
    try {
      await fse.ensureDir(dirPath);
      await fs.writeFile(filePath, content);
    } catch (error) {
      assertIsNodeError(error);
      debugLog("Text file write failed.", error);
      throw new GenericIOError("Write");
    }
  };
}
