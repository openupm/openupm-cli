import { AsyncResult, Result } from "ts-results-es";
import fs from "fs/promises";
import { assertIsNodeError } from "../utils/error-type-guards";
import fse from "fs-extra";
import path from "path";
import { DebugLog } from "../logging";

function resultifyFsOp<T>(
  debugLog: DebugLog,
  op: () => Promise<T>
): AsyncResult<T, NodeJS.ErrnoException> {
  return new AsyncResult(Result.wrapAsync(op)).mapErr((error) => {
    assertIsNodeError(error);
    debugLog("fs-operation failed.", error);
    return error;
  });
}

/**
 * Function for loading the content of a text file.
 * @param path The path to the file.
 * @returns The files text content.
 */
export type ReadTextFile = (
  path: string
) => AsyncResult<string, NodeJS.ErrnoException>;

/**
 * Makes a {@link ReadTextFile} function.
 */
export function makeTextReader(debugLog: DebugLog): ReadTextFile {
  return (path) =>
    resultifyFsOp(debugLog, () => fs.readFile(path, { encoding: "utf8" }));
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
) => AsyncResult<void, NodeJS.ErrnoException>;

/**
 * Makes a {@link WriteTextFile} function.
 */
export function makeTextWriter(debugLog: DebugLog): WriteTextFile {
  return (filePath, content) => {
    const dirPath = path.dirname(filePath);
    return resultifyFsOp(debugLog, () => fse.ensureDir(dirPath)).andThen(() =>
      resultifyFsOp(debugLog, () => fs.writeFile(filePath, content))
    );
  };
}

/**
 * Attempts to get the names of all directories in a directory.
 * @param directoryPath The directories name.
 * @param debugLog Debug-log function.
 * TODO: Convert to service function.
 */
export function tryGetDirectoriesIn(
  directoryPath: string,
  debugLog: DebugLog
): AsyncResult<ReadonlyArray<string>, NodeJS.ErrnoException> {
  return resultifyFsOp(debugLog, () =>
    fs.readdir(directoryPath, { withFileTypes: true })
  )
    .map((entries) => entries.filter((it) => it.isDirectory()))
    .map((directories) => directories.map((it) => it.name));
}
