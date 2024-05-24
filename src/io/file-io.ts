import { AsyncResult, Result } from "ts-results-es";
import fs from "fs/promises";
import { CustomError } from "ts-custom-error";
import { assertIsNodeError } from "../utils/error-type-guards";
import fse from "fs-extra";
import path from "path";

/**
 * Reason why a file-system operation failed.
 */
export enum FsErrorReason {
  /**
   * Some generic reason.
   */
  Other,
  /**
   * The path did not exist.
   */
  Missing,
}

/**
 * Generic error for when interacting with the file-system failed.
 */
export class FsError extends CustomError {
  // noinspection JSUnusedLocalSymbols
  private readonly _class = "FsError";

  constructor(
    /**
     * The path of the file or directory which caused the error.
     */
    public readonly path: string,
    /**
     * The reason why the operation failed.
     */
    public readonly reason: FsErrorReason
  ) {
    super("An interaction with the file-system caused an error.");
  }
}

function fsOperation<T>(path: string, op: () => Promise<T>) {
  return new AsyncResult(Result.wrapAsync(op)).mapErr((error) => {
    assertIsNodeError(error);
    const cause =
      error.code === "ENOENT" ? FsErrorReason.Missing : FsErrorReason.Other;
    return new FsError(path, cause);
  });
}

/**
 * Error for when a file-read failed.
 */
export type FileReadError = FsError;

/**
 * Function for loading the content of a text file.
 * @param path The path to the file.
 * @returns The files text content.
 */
export type ReadTextFile = (path: string) => AsyncResult<string, FileReadError>;

/**
 * Makes a {@link ReadTextFile} function.
 */
export function makeTextReader(): ReadTextFile {
  return (path) =>
    fsOperation(path, () => fs.readFile(path, { encoding: "utf8" }));
}

/**
 * Error for when a file-write failed.
 */
export type FileWriteError = FsError;

/**
 * Function for overwriting the content of a text file. Creates the file
 * if it does not exist.
 * @param filePath The path to the file.
 * @param content The content to write.
 */
export type WriteTextFile = (
  filePath: string,
  content: string
) => AsyncResult<void, FileWriteError>;

/**
 * Makes a {@link WriteTextFile} function.
 */
export function makeTextWriter(): WriteTextFile {
  return (filePath, content) => {
    const dirPath = path.dirname(filePath);
    return fsOperation(dirPath, () => fse.ensureDir(dirPath)).andThen(() =>
      fsOperation(filePath, () => fs.writeFile(filePath, content))
    );
  };
}

/**
 * Error which may occur when getting all directory names in a directory.
 */
export type GetDirectoriesError = FsError;

/**
 * Attempts to get the names of all directories in a directory.
 * @param directoryPath The directories name.
 */
export function tryGetDirectoriesIn(
  directoryPath: string
): AsyncResult<ReadonlyArray<string>, GetDirectoriesError> {
  return fsOperation(directoryPath, () =>
    fs.readdir(directoryPath, { withFileTypes: true })
  )
    .map((entries) => entries.filter((it) => it.isDirectory()))
    .map((directories) => directories.map((it) => it.name));
}
