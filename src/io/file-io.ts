import { AsyncResult, Result } from "ts-results-es";
import fs from "fs/promises";
import { CustomError } from "ts-custom-error";
import { assertIsNodeError } from "../utils/error-type-guards";
import fse from "fs-extra";
import path from "path";

/**
 * Error for when a file or directory did not exist.
 */
export class NotFoundError extends CustomError {
  private readonly _class = "NotFoundError";
  constructor(
    /**
     * The path to the missing file.
     */
    readonly path: string
  ) {
    super(
      "An IO operation was performed on a file or directory which does not exist."
    );
  }
}

/**
 * Generic error for when interacting with the file-system failed.
 */
export class FsError extends CustomError {
  // noinspection JSUnusedLocalSymbols
  private readonly _class = "FsError";

  constructor(
    /**
     * The error that caused the failure.
     */
    public readonly cause?: NodeJS.ErrnoException
  ) {
    super("An interaction with the file-system caused an error.", { cause });
  }
}

function fsOperation<T>(op: () => Promise<T>) {
  return new AsyncResult(Result.wrapAsync(op)).mapErr((error) => {
    assertIsNodeError(error);
    return new FsError(error);
  });
}

/**
 * Error for when a file-read failed.
 */
export type FileReadError = NotFoundError | FsError;

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
    fsOperation(() => fs.readFile(path, { encoding: "utf8" })).mapErr(
      (error) => {
        if (error.cause!.code === "ENOENT") return new NotFoundError(path);
        return error;
      }
    );
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
  return (filePath, content) =>
    fsOperation(() => fse.ensureDir(path.dirname(filePath))).andThen(() =>
      fsOperation(() => fs.writeFile(filePath, content))
    );
}

/**
 * Error which may occur when getting all directory names in a directory.
 */
export type GetDirectoriesError = NotFoundError | FsError;

/**
 * Attempts to get the names of all directories in a directory.
 * @param directoryPath The directories name.
 */
export function tryGetDirectoriesIn(
  directoryPath: string
): AsyncResult<ReadonlyArray<string>, GetDirectoriesError> {
  return fsOperation(() => fs.readdir(directoryPath, { withFileTypes: true }))
    .map((entries) => entries.filter((it) => it.isDirectory()))
    .map((directories) => directories.map((it) => it.name))
    .mapErr((error) => {
      if (error.cause!.code === "ENOENT")
        return new NotFoundError(directoryPath);
      return error;
    });
}
