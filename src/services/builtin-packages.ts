import { ReleaseVersion } from "../domain/editor-version";
import { AsyncResult } from "ts-results-es";
import {
  GetEditorInstallPathError,
  tryGetEditorInstallPath,
} from "../io/special-paths";
import { DomainName } from "../domain/domain-name";
import { CustomError } from "ts-custom-error";
import path from "path";
import { IOError, NotFoundError, tryGetDirectoriesIn } from "../io/file-io";

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
export type LoadBuiltInPackagesError =
  | GetEditorInstallPathError
  | EditorNotInstalledError
  | IOError;

/**
 * Service for interacting with the built-in packages that are installed
 * with a Unity editor.
 */
export interface BuiltInPackagesService {
  /**
   * Attempts to load all built-in packages for an installed editor.
   * @param editorVersion The editors version.
   */
  tryLoadAll(
    editorVersion: ReleaseVersion
  ): AsyncResult<ReadonlyArray<DomainName>, LoadBuiltInPackagesError>;
}

/**
 * Makes a {@link BuiltInPackagesService}.
 */
export function makeBuiltInPackagesService(): BuiltInPackagesService {
  return {
    tryLoadAll(editorVersion) {
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
    },
  };
}
