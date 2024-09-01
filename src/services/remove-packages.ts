import { AsyncResult, Ok, Result } from "ts-results-es";
import { PackumentNotFoundError } from "../common-errors";
import { tryRemoveProjectDependency } from "../domain/dependency-management";
import { DomainName } from "../domain/domain-name";
import { PackageUrl } from "../domain/package-url";
import { UnityProjectManifest } from "../domain/project-manifest";
import { SemanticVersion } from "../domain/semantic-version";
import {
  LoadProjectManifest,
  loadProjectManifestUsing,
  saveProjectManifest,
  SaveProjectManifest,
} from "../io/project-manifest-io";
import { DebugLog } from "../logging";
import { resultifyAsyncOp } from "../utils/result-utils";

/**
 * Contains information about a package that was removed from a project.
 */
export type RemovedPackage = {
  /**
   * The name of the removed package.
   */
  name: DomainName;
  /**
   * The version of the removed package.
   */
  version: SemanticVersion | PackageUrl;
};

/**
 * Errors which may occur when removing packages from a project.
 */
export type RemovePackagesError = PackumentNotFoundError;

/**
 * Service function for removing packages from a project.
 */
export type RemovePackages = (
  projectPath: string,
  packageNames: ReadonlyArray<DomainName>
) => AsyncResult<ReadonlyArray<RemovedPackage>, RemovePackagesError>;

/**
 * Makes a {@link RemovePackages} which atomically removes a batch of
 * packages from a project manifest.
 */
export function RemovePackagesFromManifest(
  loadProjectManifest: LoadProjectManifest,
  saveProjectManifest: SaveProjectManifest
): RemovePackages {
  function tryRemoveAll(
    manifest: UnityProjectManifest,
    packageNames: ReadonlyArray<DomainName>
  ): Result<
    [UnityProjectManifest, ReadonlyArray<RemovedPackage>],
    PackumentNotFoundError
  > {
    if (packageNames.length == 0) return Ok([manifest, []]);

    const currentPackageName = packageNames[0]!;
    const remainingPackageNames = packageNames.slice(1);

    return tryRemoveProjectDependency(manifest, currentPackageName).andThen(
      ([updatedManifest, removedPackage]) =>
        tryRemoveAll(updatedManifest, remainingPackageNames).map(
          ([finalManifest, removedPackages]) => [
            finalManifest,
            [removedPackage, ...removedPackages],
          ]
        )
    );
  }

  return (projectPath, packageNames) => {
    // load manifest
    const initialManifest = resultifyAsyncOp<
      UnityProjectManifest,
      RemovePackagesError
    >(loadProjectManifest(projectPath));

    // remove
    const removeResult = initialManifest.andThen((it) =>
      tryRemoveAll(it, packageNames)
    );

    return removeResult.map(async ([updatedManifest, removedPackages]) => {
      await saveProjectManifest(projectPath, updatedManifest);
      return removedPackages;
    });
  };
}

/**
 * Default {@link RemovePackages} function. Uses {@link RemovePackagesFromManifest}.
 */
export const removePackages = (debugLog: DebugLog) =>
  RemovePackagesFromManifest(
    loadProjectManifestUsing(debugLog),
    saveProjectManifest
  );
