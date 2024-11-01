import path from "path";
import { CustomError } from "ts-custom-error";
import { AsyncResult } from "ts-results-es";
import { DomainName } from "../domain/domain-name.js";
import { ReleaseVersion } from "../domain/editor-version.js";
import { assertIsNodeError } from "../domain/error-type-guards.js";
import { resultifyAsyncOp } from "../domain/result-utils.js";
import {
  GetEditorInstallPathError,
  tryGetEditorInstallPath,
} from "../domain/special-paths.js";
import type { GetDirectoriesIn } from "../io/fs.js";

/**
 * Error for when an editor-version is not installed.
 */
export class EditorNotInstalledError extends CustomError {
  constructor(
    /**
     * The version that is not installed.
     */
    public readonly version: ReleaseVersion
  ) {
    super();
  }
}

/**
 * Errors which may occur when getting the builtin packages for an editor-version.
 */
export type FindBuiltInPackagesError =
  | GetEditorInstallPathError
  | EditorNotInstalledError;

/**
 * Finds the names of built-in packages using an installed editor.
 * @param getDirectoriesIn IO function for getting the names of all sub directories
 * of a directory.
 * @param editorVersion The version of the editor for which to get the built-in
 * packages.
 * @returns A result with the names or an error.
 */
export function findBuiltInPackagesUsing(
  getDirectoriesIn: GetDirectoriesIn,
  editorVersion: ReleaseVersion
): AsyncResult<ReadonlyArray<DomainName>, FindBuiltInPackagesError> {
  const pathResult = tryGetEditorInstallPath(editorVersion);
  if (pathResult.isErr()) return pathResult.toAsyncResult();
  const installPath = pathResult.value;
  const packagesDir = path.join(
    installPath,
    "Editor/Data/Resources/PackageManager/BuiltInPackages"
  );

  return (
    resultifyAsyncOp(getDirectoriesIn(packagesDir))
      // We can assume correct format
      .map((names) => names as DomainName[])
      .mapErr((error) => {
        assertIsNodeError(error);

        if (error.code === "ENOENT")
          return new EditorNotInstalledError(editorVersion);

        throw error;
      })
  );
}
