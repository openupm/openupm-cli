import { CustomError } from "ts-custom-error";
import type { Err } from "ts-results-es";
import { logResolvedDependency } from "../cli/dependency-logging";
import { PackumentNotFoundError } from "../domain/common-errors";
import {
  type FailedNode,
  NodeType,
  traverseDependencyGraph,
} from "../domain/dependency-graph";
import type { DomainName } from "../domain/domain-name";
import {
  type EditorVersion,
  type ReleaseVersion,
  compareEditorVersion,
} from "../domain/editor-version";
import { partialApply } from "../domain/fp-utils";
import type { DebugLog } from "../domain/logging";
import { tryGetTargetEditorVersionFor } from "../domain/package-manifest";
import {
  type PackageReference,
  type VersionReference,
  makePackageReference,
  splitPackageReference,
} from "../domain/package-reference";
import { PackageUrl } from "../domain/package-url";
import type { ResolvePackumentVersionError } from "../domain/packument";
import {
  type UnityProjectManifest,
  addTestable,
  hasDependency,
  mapScopedRegistry,
  setDependency,
} from "../domain/project-manifest";
import { type Registry, unityRegistry } from "../domain/registry";
import { unityRegistryUrl } from "../domain/registry-url";
import {
  addScope,
  makeEmptyScopedRegistryFor,
} from "../domain/scoped-registry";
import { SemanticVersion } from "../domain/semantic-version";
import { isZod } from "../domain/zod-utils";
import type { CheckUrlExists } from "../io/check-url";
import type { GetRegistryPackument } from "../io/packument-io";
import type { ReadTextFile, WriteTextFile } from "../io/text-file-io";
import { loadProjectManifestUsing } from "./get-dependencies";
import { FetchRegistryPackumentVersion } from "./get-registry-packument-version";
import { resolveDependenciesUsing } from "./resolve-dependencies";
import { saveProjectManifestUsing } from "./write-dependencies";

/**
 * Error that is thrown when a package should be added that is incompatible
 * with the current editor.
 */
export class PackageIncompatibleError extends CustomError {
  constructor(
    /**
     * The package that was added.
     */
    public readonly packageRef: PackageReference,
    /**
     * The packages target editor version.
     */
    public readonly editorVersion: EditorVersion
  ) {
    super();
  }
}

/**
 * Represents a dependency which could not be resolved.
 */
export type UnresolvedDependency = Readonly<{
  /**
   * The name of the package that could not be resolved.
   */
  name: DomainName;
  /**
   * The version that could not be resolved.
   */
  version: SemanticVersion;
  /**
   * Errors which prevented the package from being resolved. Indexed by the
   * associated registry.
   */
  errors: FailedNode["errors"];
}>;

/**
 * Error for when a package could not be added because one or more of it's
 * dependencies could not be resolved.
 */
export class UnresolvedDependenciesError extends CustomError {
  constructor(
    /**
     * The package that should have been added.
     */
    public readonly packageRef: PackageReference,
    /**
     * The dependencies which could not be resolved.
     */
    public readonly dependencies: ReadonlyArray<UnresolvedDependency>
  ) {
    super();
  }
}

/**
 * Error for when package compatibility could not be established because,
 * for example, it's target editor was malformed.
 */
export class CompatibilityCheckFailedError extends CustomError {
  constructor(
    /**
     * The package that could not be added.
     */
    public readonly packageRef: PackageReference
  ) {
    super();
  }
}

/**
 * The result of adding a dependency.
 */
export type AddResult =
  | {
      /**
       * Indicates that the dependency was added.
       */
      type: "added";
      /**
       * The version that was added.
       */
      version: SemanticVersion | PackageUrl;
    }
  | {
      /**
       * Indicates that the dependency was already present in the manifest and
       * only it's version was changed.
       */
      type: "upgraded";
      /**
       * The version that was in the manifest previously.
       */
      fromVersion: SemanticVersion | PackageUrl;
      /**
       * The new version.
       */
      toVersion: SemanticVersion | PackageUrl;
    }
  | {
      /**
       * Indicates that the manifest already contained the dependency.
       */
      type: "noChange";
      /**
       * The version in the manifest.
       */
      version: SemanticVersion | PackageUrl;
    };

function pickMostFixable(
  a: Err<ResolvePackumentVersionError>,
  b: Err<ResolvePackumentVersionError>
): Err<ResolvePackumentVersionError> {
  // Anything is more fixable than packument-not-found
  if (
    a.error instanceof PackumentNotFoundError &&
    !(b.error instanceof PackumentNotFoundError)
  )
    return b;
  else if (
    b.error instanceof PackumentNotFoundError &&
    !(a.error instanceof PackumentNotFoundError)
  )
    return a;
  return a;
}

/**
 * Atomically adds one or more dependencies to a project manifest.
 * @param readTextFile IO function for reading text files.
 * @param writeTextFile IO function for writing text files.
 * @param fetchPackument IO function for fetching remote packuments.
 * @param checkUrlExists  IO function for checking whether a URL exists.
 * @param debugLog IO function for printing debug logs.
 * @param projectDirectory The projects root directory.
 * @param editorVersion The projects editor version. Will be used to check
 * compatibility. If set to null then compatibility will not be checked.
 * @param primaryRegistry The primary registry from which to resolve
 * dependencies.
 * @param useUpstream Whether to fall back to the upstream registry.
 * @param force Whether to force add the dependencies.
 * @param shouldAddTestable Whether to also add dependencies to the `testables`.
 * @param pkgs References to the dependencies to add.
 * @returns A summary of the added packages.
 */
export async function addDependenciesUsing(
  readTextFile: ReadTextFile,
  writeTextFile: WriteTextFile,
  fetchPackument: GetRegistryPackument,
  checkUrlExists: CheckUrlExists,
  debugLog: DebugLog,
  projectDirectory: string,
  editorVersion: ReleaseVersion | null,
  primaryRegistry: Registry,
  useUpstream: boolean,
  force: boolean,
  shouldAddTestable: boolean,
  pkgs: ReadonlyArray<PackageReference>
): Promise<Readonly<Record<DomainName, AddResult>>> {
  const loadProjectManifest = partialApply(
    loadProjectManifestUsing,
    readTextFile,
    debugLog
  );

  const saveProjectManifest = partialApply(
    saveProjectManifestUsing,
    writeTextFile
  );

  const getRegistryPackumentVersion = partialApply(
    FetchRegistryPackumentVersion,
    fetchPackument
  );

  async function addSingle(
    manifest: UnityProjectManifest,
    packageName: DomainName,
    requestedVersion: VersionReference | undefined
  ): Promise<[UnityProjectManifest, AddResult]> {
    // is upstream package flag
    let isUpstreamPackage = false;

    // packages that added to scope registry
    const packagesInScope = Array.of<DomainName>();
    let versionToAdd = requestedVersion;
    if (
      requestedVersion === undefined ||
      !isZod(requestedVersion, PackageUrl)
    ) {
      let resolveResult = await getRegistryPackumentVersion(
        packageName,
        requestedVersion,
        primaryRegistry
      ).promise;
      if (resolveResult.isErr() && useUpstream) {
        const upstreamResult = await getRegistryPackumentVersion(
          packageName,
          requestedVersion,
          unityRegistry
        ).promise;
        if (upstreamResult.isOk()) {
          resolveResult = upstreamResult;
          isUpstreamPackage = true;
        } else {
          resolveResult = pickMostFixable(resolveResult, upstreamResult);
        }
      }

      if (resolveResult.isErr()) throw resolveResult.error;

      const packumentVersion = resolveResult.value.packumentVersion;
      versionToAdd = packumentVersion.version;

      // Only do compatibility check when we have a editor version to check against
      if (editorVersion !== null) {
        let targetEditorVersion: EditorVersion | null;
        try {
          targetEditorVersion = tryGetTargetEditorVersionFor(packumentVersion);
        } catch (error) {
          if (!force) {
            const packageRef = makePackageReference(packageName, versionToAdd);
            await debugLog(
              `"${packageRef}" is malformed. Target editor version could not be determined.`
            );
            throw new CompatibilityCheckFailedError(packageRef);
          }
          targetEditorVersion = null;
        }

        // verify editor version
        const isCompatible =
          targetEditorVersion === null ||
          compareEditorVersion(editorVersion, targetEditorVersion) >= 0;
        if (!isCompatible && !force)
          throw new PackageIncompatibleError(
            makePackageReference(packageName, versionToAdd),
            targetEditorVersion!
          );
      }

      // packagesInScope
      if (!isUpstreamPackage) {
        await debugLog(
          `fetch: ${makePackageReference(packageName, requestedVersion)}`
        );
        const dependencyGraph = await resolveDependenciesUsing(
          checkUrlExists,
          fetchPackument,
          [primaryRegistry, unityRegistry],
          packageName,
          versionToAdd,
          true
        );

        const unresolvedDependencies = Array.of<UnresolvedDependency>();
        for (const [
          dependencyName,
          dependencyVersion,
          dependency,
        ] of traverseDependencyGraph(dependencyGraph)) {
          if (dependency.type === NodeType.Failed) {
            // If the manifest already has the dependency than it does not
            // really matter that it was not resolved.
            if (!hasDependency(manifest, dependencyName))
              unresolvedDependencies.push({
                name: dependencyName,
                version: dependencyVersion,
                errors: dependency.errors,
              });
            continue;
          }
          if (dependency.type === NodeType.Unresolved) continue;

          const dependencyRef = makePackageReference(
            dependencyName,
            dependencyVersion
          );
          await logResolvedDependency(
            debugLog,
            dependencyRef,
            dependency.source
          );

          const isUnityPackage =
            dependency.source === "built-in" ||
            dependency.source === unityRegistryUrl;
          if (isUnityPackage) continue;

          // add depsValid to packagesInScope.
          packagesInScope.push(dependencyName);
        }

        // print suggestion for depsInvalid
        if (unresolvedDependencies.length > 0 && !force)
          throw new UnresolvedDependenciesError(
            makePackageReference(packageName, versionToAdd),
            unresolvedDependencies
          );
      } else packagesInScope.push(packageName);
    }
    // add to dependencies
    const oldVersion = manifest.dependencies[packageName];

    manifest = setDependency(
      manifest,
      packageName,
      versionToAdd as PackageUrl | SemanticVersion
    );

    if (!isUpstreamPackage && packagesInScope.length > 0) {
      manifest = mapScopedRegistry(manifest, primaryRegistry.url, (initial) => {
        let updated =
          initial ?? makeEmptyScopedRegistryFor(primaryRegistry.url);

        updated = packagesInScope.reduce(addScope, updated!);

        return updated;
      });
    }
    if (shouldAddTestable) manifest = addTestable(manifest, packageName);

    if (!oldVersion) {
      return [
        manifest,
        {
          type: "added",
          version: versionToAdd as PackageUrl | SemanticVersion,
        },
      ];
    } else if (oldVersion !== versionToAdd) {
      return [
        manifest,
        {
          type: "upgraded",
          fromVersion: oldVersion,
          toVersion: versionToAdd as PackageUrl | SemanticVersion,
        },
      ];
    } else {
      return [
        manifest,
        {
          type: "noChange",
          version: versionToAdd as PackageUrl | SemanticVersion,
        },
      ];
    }
  }

  let manifest = await loadProjectManifest(projectDirectory);

  const results: Record<DomainName, AddResult> = {};
  for (const pkg of pkgs) {
    const [packageName, version] = splitPackageReference(pkg);
    const [newManifest, result] = await addSingle(
      manifest,
      packageName,
      version
    );
    manifest = newManifest;
    results[packageName] = result;
  }

  await saveProjectManifest(projectDirectory, manifest);

  return results;
}