import { AsyncResult, Result } from "ts-results-es";
import fs from "fs/promises";
import { CustomError } from "ts-custom-error";
import { IOError } from "../common-errors";
import { assertIsError } from "./error-type-guards";

/**
 * Error for when a file or directory did not exist.
 */
export class NotFoundError extends CustomError {
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
 * Attempts to read the content of a text file.
 * @param path The path to the file.
 */
export function tryReadTextFromFile(
  path: string
): AsyncResult<string, FileReadError> {
  return new AsyncResult(
    Result.wrapAsync(() => fs.readFile(path, { encoding: "utf8" }))
  ).mapErr((error) => {
    assertIsError(error);
    if (error.code === "ENOENT") return new NotFoundError(path);
    return new IOError(error);
  });
}
