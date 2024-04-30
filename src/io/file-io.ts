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
 * Generic IO error for when interacting with the file-system failed.
 */
export class IOError extends CustomError {
  private readonly _class = "IOError";

  constructor(
    /**
     * The actual error that caused the failure.
     */
    public readonly cause?: NodeJS.ErrnoException
  ) {
    super("An interaction with the file-system caused an error.", { cause });
  }
}

/**
 * Error for when a file-read failed.
 */
export type FileReadError = NotFoundError | IOError;

/**
 * Error for when a file-write failed.
 */
export type FileWriteError = IOError;

function fsOperation<T>(op: () => Promise<T>) {
  return new AsyncResult(Result.wrapAsync(op)).mapErr((error) => {
    assertIsNodeError(error);
    return new IOError(error);
  });
}

/**
 * Attempts to read the content of a text file.
 * @param path The path to the file.
 */
export function tryReadTextFromFile(
  path: string
): AsyncResult<string, FileReadError> {
  return fsOperation(() => fs.readFile(path, { encoding: "utf8" })).mapErr(
    (error) => {
      if (error.cause!.code === "ENOENT") return new NotFoundError(path);
      return error;
    }
  );
}

/**
 * Attempts to overwrite the content of a text file.
 * @param filePath The path to the file.
 * @param content The content to write.
 */
export function tryWriteTextToFile(
  filePath: string,
  content: string
): AsyncResult<void, FileWriteError> {
  return fsOperation(() => fse.ensureDir(path.dirname(filePath))).andThen(() =>
    fsOperation(() => fs.writeFile(filePath, content))
  );
}

/**
 * Error which may occur when getting all directory names in a directory.
 */
export type GetDirectoriesError = NotFoundError | IOError;

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
