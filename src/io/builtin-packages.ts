import { ReleaseVersion } from "../domain/editor-version";
import { AsyncResult } from "ts-results-es";
import {
  GetEditorInstallPathError,
  tryGetEditorInstallPath,
} from "./special-paths";
import { DomainName } from "../domain/domain-name";
import { CustomError } from "ts-custom-error";
import path from "path";
import { DebugLog } from "../logging";
import { tryGetDirectoriesIn } from "./directory-io";
import { assertIsNodeError } from "../utils/error-type-guards";
import { resultifyAsyncOp } from "../utils/result-utils";

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
 * Function for loading all built-in packages for an installed editor.
 * @param editorVersion The editors version.
 */
export type FindBuiltInPackages = (
  editorVersion: ReleaseVersion
) => AsyncResult<ReadonlyArray<DomainName>, FindBuiltInPackagesError>;

/**
 * Makes a {@link FindBuiltInPackages} function.
 */
export function makeFindBuiltInPackages(
  debugLog: DebugLog
): FindBuiltInPackages {
  return (editorVersion) => {
    {
      const pathResult = tryGetEditorInstallPath(editorVersion);
      if (pathResult.isErr()) return pathResult.toAsyncResult();
      const installPath = pathResult.value;
      const packagesDir = path.join(
        installPath,
        "Editor/Data/Resources/PackageManager/BuiltInPackages"
      );

      return (
        resultifyAsyncOp<readonly string[], NodeJS.ErrnoException>(
          tryGetDirectoriesIn(packagesDir)
        )
          // We can assume correct format
          .map((names) => names as DomainName[])
          .mapErr((error) => {
            assertIsNodeError(error);
            debugLog(
              "Failed to get directories in built-in package directory",
              error
            );
            if (error.code === "ENOENT")
              return new EditorNotInstalledError(editorVersion);
            throw error;
          })
      );
    }
  };
}
