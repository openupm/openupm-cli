import { AsyncResult, Err, Ok, Result } from "ts-results-es";
import { ReadTextFile, WriteTextFile } from "./fs-result";
import { EOL } from "node:os";
import { Npmrc } from "../domain/npmrc";
import path from "path";
import { RequiredEnvMissingError } from "./upm-config-io";
import { GetHomePath } from "./special-paths";
import { GenericIOError } from "./common-errors";

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
export function makeFindNpmrcPath(getHomePath: GetHomePath): FindNpmrcPath {
  return () => getHomePath().map((homePath) => path.join(homePath, ".npmrc"));
}

/**
 * Error that might occur when loading a npmrc.
 */
export type NpmrcLoadError = GenericIOError;

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
export function makeLoadNpmrc(readFile: ReadTextFile): LoadNpmrc {
  return (path) =>
    readFile(path)
      .map<Npmrc | null>((content) => content.split(EOL))
      .orElse((error) =>
        error.code === "ENOENT" ? Ok(null) : Err(new GenericIOError("Read"))
      );
}

/**
 * Error that might occur when saving a npmrc.
 */
export type NpmrcSaveError = GenericIOError;

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
export function makeSaveNpmrc(writeFile: WriteTextFile): SaveNpmrc {
  return (path, npmrc) => {
    const content = npmrc.join(EOL);
    return writeFile(path, content).mapErr(() => new GenericIOError("Write"));
  };
}
