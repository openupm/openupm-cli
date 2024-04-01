import { AsyncResult } from "ts-results-es";
import {
  FileReadError,
  FileWriteError,
  tryReadTextFromFile,
  tryWriteTextToFile,
} from "./file-io";
import { EOL } from "node:os";
import { Npmrc } from "../domain/npmrc";

/**
 * Error that might occur when loading a npmrc.
 */
export type NpmrcLoadError = FileReadError;

/**
 * Error that might occur when saving a npmrc.
 */
export type NpmrcSaveError = FileWriteError;

/**
 * Attempts to load an .npmrc. It will only load simple key-value pairs. That
 * means no objects and no arrays.
 * @param path The path to load from.
 */
export function tryLoadNpmrc(path: string): AsyncResult<Npmrc, NpmrcLoadError> {
  return tryReadTextFromFile(path).map((content) => content.split(EOL));
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
