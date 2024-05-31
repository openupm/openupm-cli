import { AsyncResult, Err, Ok, Result } from "ts-results-es";
import {
  removeDependency,
  UnityProjectManifest,
} from "../domain/project-manifest";
import { PackumentNotFoundError } from "../common-errors";
import { DomainName } from "../domain/domain-name";
import {
  LoadProjectManifest,
  ManifestLoadError,
  ManifestWriteError,
  WriteProjectManifest,
} from "../io/project-manifest-io";
import { SemanticVersion } from "../domain/semantic-version";
import { PackageUrl } from "../domain/package-url";

export type RemovedPackage = {
  name: DomainName;
  version: SemanticVersion | PackageUrl;
};

export type RemovePackagesError =
  | ManifestLoadError
  | PackumentNotFoundError
  | ManifestWriteError;

export type RemovePackages = (
  projectPath: string,
  packageNames: ReadonlyArray<DomainName>
) => AsyncResult<ReadonlyArray<RemovedPackage>, RemovePackagesError>;

export function makeRemovePackages(
  loadProjectManifest: LoadProjectManifest,
  writeProjectManifest: WriteProjectManifest
): RemovePackages {
  const tryRemoveSingle = function (
    manifest: UnityProjectManifest,
    packageName: DomainName
  ): Result<[UnityProjectManifest, RemovedPackage], PackumentNotFoundError> {
    // not found array
    const versionInManifest = manifest.dependencies[packageName];
    if (versionInManifest === undefined) {
      return Err(new PackumentNotFoundError(packageName));
    }

    manifest = removeDependency(manifest, packageName);

    manifest = {
      ...manifest,
      scopedRegistries: manifest.scopedRegistries
        // Remove package scope from all scoped registries
        ?.map((scopedRegistry) => ({
          ...scopedRegistry,
          scopes: scopedRegistry.scopes.filter(
            (scope) => scope !== packageName
          ),
        })),
    };

    return Ok([manifest, { name: packageName, version: versionInManifest }]);
  };

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

    return tryRemoveSingle(manifest, currentPackageName).andThen(
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
    const initialManifest = loadProjectManifest(projectPath);

    // remove
    const removeResult = initialManifest.andThen((it) =>
      tryRemoveAll(it, packageNames)
    );

    return removeResult.andThen(([updatedManifest, removedPackages]) =>
      writeProjectManifest(projectPath, updatedManifest).map(
        () => removedPackages
      )
    );
  };
}
