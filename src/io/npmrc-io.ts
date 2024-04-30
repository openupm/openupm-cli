import { AsyncResult, Err, Ok, Result } from "ts-results-es";
import {
  FileWriteError,
  IOError,
  NotFoundError,
  ReadTextFile,
  WriteTextFile,
} from "./file-io";
import { EOL } from "node:os";
import { Npmrc } from "../domain/npmrc";
import path from "path";
import { RequiredEnvMissingError } from "./upm-config-io";
import { GetHomePath } from "./special-paths";

/**
 * Error for when npmrc path could not be determined.
 */
export type FindNpmrcError = RequiredEnvMissingError;

/**
 * Function for determining the path of the users .npmrc file.
 * @returns The path to the file.
 */
export type FindNpmrcPath = () => Result<string, FindNpmrcError>;

/**
 * Makes a {@link FindNpmrcPath} function.
 */
export function makeNpmrcPathFinder(getHomePath: GetHomePath): FindNpmrcPath {
  return () => getHomePath().map((homePath) => path.join(homePath, ".npmrc"));
}

/**
 * Error that might occur when loading a npmrc.
 */
export type NpmrcLoadError = IOError;

/**
 * Function for loading npmrc.
 * @param path The path to load from.
 * @returns The npmrc's lines or null if not found.
 */
export type LoadNpmrc = (
  path: string
) => AsyncResult<Npmrc | null, NpmrcLoadError>;

/**
 * Makes a {@link LoadNpmrc} function.
 */
export function makeNpmrcLoader(readFile: ReadTextFile): LoadNpmrc {
  return (path) =>
    readFile(path)
      .map<Npmrc | null>((content) => content.split(EOL))
      .orElse((error) =>
        error instanceof NotFoundError ? Ok(null) : Err(error)
      );
}

/**
 * Error that might occur when saving a npmrc.
 */
export type NpmrcSaveError = FileWriteError;

/**
 * Function for saving npmrc files. Overwrites the content of the file.
 * @param path The path to the file.
 * @param npmrc The new lines for the file.
 */
export type SaveNpmrc = (
  path: string,
  npmrc: Npmrc
) => AsyncResult<void, NpmrcSaveError>;

/**
 * Makes a {@link SaveNpmrc} function.
 */
export function makeNpmrcSaver(writeFile: WriteTextFile): SaveNpmrc {
  return (path, npmrc) => {
    const content = npmrc.join(EOL);
    return writeFile(path, content);
  };
}
