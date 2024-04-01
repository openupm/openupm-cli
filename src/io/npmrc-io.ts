import { AsyncResult } from "ts-results-es";
import { FileReadError, tryReadTextFromFile } from "./file-io";
import { EOL } from "node:os";

/**
 * The content lines of a npmrc file.
 */
export type Npmrc = ReadonlyArray<string>;

/**
 * Error that might occur when loading a npmrc.
 */
export type NpmrcLoadError = FileReadError;

/**
 * Attempts to load an .npmrc. It will only load simple key-value pairs. That
 * means no objects and no arrays.
 * @param path The path to load from.
 */
export function tryLoadNpmrc(path: string): AsyncResult<Npmrc, NpmrcLoadError> {
  return tryReadTextFromFile(path).map((content) => content.split(EOL));
}
