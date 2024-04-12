import { AsyncResult, Err, Ok, Result } from "ts-results-es";
import {
  FileWriteError,
  NotFoundError,
  tryReadTextFromFile,
  tryWriteTextToFile,
} from "./file-io";
import { EOL } from "node:os";
import { Npmrc } from "../domain/npmrc";
import path from "path";
import { RequiredEnvMissingError } from "./upm-config-io";
import { IOError } from "../common-errors";
import { tryGetHomePath } from "./special-paths";

/**
 * Error that might occur when loading a npmrc.
 */
export type NpmrcLoadError = IOError;

/**
 * Error that might occur when saving a npmrc.
 */
export type NpmrcSaveError = FileWriteError;

/**
 * Tries to get the npmrc path based on env.
 */
export function tryGetNpmrcPath(): Result<string, RequiredEnvMissingError> {
  return tryGetHomePath().map((homePath) => path.join(homePath, ".npmrc"));
}

/**
 * Attempts to load an .npmrc. It will only load simple key-value pairs. That
 * means no objects and no arrays.
 * @param path The path to load from.
 */
export function tryLoadNpmrc(
  path: string
): AsyncResult<Npmrc | null, NpmrcLoadError> {
  return tryReadTextFromFile(path)
    .map<Npmrc | null>((content) => content.split(EOL))
    .orElse((error) =>
      error instanceof NotFoundError ? Ok(null) : Err(error)
    );
}

/**
 * Attempts to save a npmrc. Overwrites the content of the file.
 * @param path The path to the file.
 * @param npmrc The new lines for the file.
 */
export function trySaveNpmrc(
  path: string,
  npmrc: Npmrc
): AsyncResult<void, NpmrcSaveError> {
  const content = npmrc.join(EOL);
  return tryWriteTextToFile(path, content);
}
