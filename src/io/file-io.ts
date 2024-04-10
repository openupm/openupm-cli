import { AsyncResult, Result } from "ts-results-es";
import fs from "fs/promises";
import { CustomError } from "ts-custom-error";
import { IOError } from "../common-errors";
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
 * Error for when a file-read failed.
 */
export type FileReadError = NotFoundError | IOError;

/**
 * Error for when a file-write failed.
 */
export type FileWriteError = IOError;

/**
 * Attempts to read the content of a text file.
 * @param path The path to the file.
 */
export function tryReadTextFromFile(
  path: string
): AsyncResult<string, FileReadError> {
  return new AsyncResult(
    Result.wrapAsync(() => fs.readFile(path, { encoding: "utf8" }))
  ).mapErr((error) => {
    assertIsNodeError(error);
    if (error.code === "ENOENT") return new NotFoundError(path);
    return new IOError(error);
  });
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
  return new AsyncResult(
    Result.wrapAsync(() => fse.ensureDir(path.dirname(filePath)))
  )
    .andThen(() => Result.wrapAsync(() => fs.writeFile(filePath, content)))
    .mapErr((error) => {
      assertIsNodeError(error);
      return new IOError(error);
    });
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
  return new AsyncResult(
    Result.wrapAsync(() => fs.readdir(directoryPath, { withFileTypes: true }))
  )
    .map((entries) => entries.filter((it) => it.isDirectory()))
    .map((directories) => directories.map((it) => it.name))
    .mapErr((error) => {
      assertIsNodeError(error);
      if (error.code === "ENOENT") return new NotFoundError(directoryPath);
      return new IOError(error);
    });
}
