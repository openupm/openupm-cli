import { ReleaseVersion } from "../domain/editor-version";
import { AsyncResult } from "ts-results-es";
import {
  GetEditorInstallPathError,
  tryGetEditorInstallPath,
} from "./special-paths";
import { DomainName } from "../domain/domain-name";
import { CustomError } from "ts-custom-error";
import path from "path";
import { IOError, NotFoundError, tryGetDirectoriesIn } from "./file-io";

/**
 * Error for when an editor-version is not installed.
 */
export class EditorNotInstalledError extends CustomError {
  private readonly _class = "EditorNotInstalledError";
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
  | EditorNotInstalledError
  | IOError;

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
export function makeBuiltInPackagesFinder(): FindBuiltInPackages {
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
        tryGetDirectoriesIn(packagesDir)
          // We can assume correct format
          .map((names) => names as DomainName[])
          .mapErr((error) =>
            error instanceof NotFoundError
              ? new EditorNotInstalledError(editorVersion)
              : error
          )
      );
    }
  };
}
