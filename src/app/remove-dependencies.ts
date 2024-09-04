import { AsyncResult } from "ts-results-es";
import { PackumentNotFoundError } from "../common-errors";
import { tryRemoveProjectDependencies } from "../domain/dependency-management";
import { DomainName } from "../domain/domain-name";
import { PackageUrl } from "../domain/package-url";
import { UnityProjectManifest } from "../domain/project-manifest";
import { SemanticVersion } from "../domain/semantic-version";
import {
  loadProjectManifestUsing,
  saveProjectManifestUsing,
} from "../io/project-manifest-io";
import { type ReadTextFile, type WriteTextFile } from "../io/text-file-io";
import { DebugLog } from "../logging";
import { partialApply } from "../utils/fp-utils";
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
 * Removes dependencies from a project.
 * @param readTextFile IO function for reading text files.
 * @param writeTextFile IO function for writing text files.
 * @param debugLog IO function for printing debug logs.
 * @param projectPath The path of the projects root directory.
 * @param packageNames The names of the dependencies to remove.
 * @returns A list of the removed dependencies or an error.
 */
export function removeDependenciesUsing(
  readTextFile: ReadTextFile,
  writeTextFile: WriteTextFile,
  debugLog: DebugLog,
  projectPath: string,
  packageNames: ReadonlyArray<DomainName>
): AsyncResult<ReadonlyArray<RemovedPackage>, RemovePackagesError> {
  const loadProjectManifest = partialApply(
    loadProjectManifestUsing,
    readTextFile,
    debugLog
  );

  const saveProjectManifest = partialApply(
    saveProjectManifestUsing,
    writeTextFile
  );

  // load manifest
  const initialManifest = resultifyAsyncOp<
    UnityProjectManifest,
    RemovePackagesError
  >(loadProjectManifest(projectPath));

  // remove
  const removeResult = initialManifest.andThen((it) =>
    tryRemoveProjectDependencies(it, packageNames)
  );

  return removeResult.map(async ([updatedManifest, removedPackages]) => {
    await saveProjectManifest(projectPath, updatedManifest);
    return removedPackages;
  });
}
