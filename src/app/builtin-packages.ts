import { ReleaseVersion } from "../domain/editor-version";
import { AsyncResult } from "ts-results-es";
import {
  GetEditorInstallPathError,
  tryGetEditorInstallPath,
} from "../io/special-paths";
import { DomainName } from "../domain/domain-name";
import { CustomError } from "ts-custom-error";
import path from "path";
import { DebugLog } from "../logging";
import { assertIsNodeError } from "../utils/error-type-guards";
import { resultifyAsyncOp } from "../utils/result-utils";
import { GetDirectoriesIn } from "../io/directory-io";

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
 * @param debugLog Logger for printing debug messages.
 * @param editorVersion The version of the editor for which to get the built-in
 * packages.
 * @returns A result with the names or an error.
 */
export function findBuiltInPackagesUsing(
  getDirectoriesIn: GetDirectoriesIn,
  debugLog: DebugLog,
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

        if (error.code === "ENOENT") {
          debugLog(
            "Failed to get directories in built-in package directory",
            error
          );
          return new EditorNotInstalledError(editorVersion);
        }

        throw error;
      })
  );
}
