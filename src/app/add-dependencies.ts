import { CustomError } from "ts-custom-error";
import { Err, Result } from "ts-results-es";
import { logResolvedDependency } from "../cli/dependency-logging";
import { PackumentNotFoundError } from "../domain/common-errors";
import {
  type FailedNode,
  NodeType,
  traverseDependencyGraph,
} from "../domain/dependency-graph";
import {
  type AddResult,
  addProjectDependency,
} from "../domain/dependency-management";
import { DomainName } from "../domain/domain-name";
import {
  type EditorVersion,
  type ReleaseVersion,
  compareEditorVersion,
} from "../domain/editor-version";
import { partialApply } from "../domain/fp-utils";
import type { DebugLog } from "../domain/logging";
import { tryGetTargetEditorVersionFor } from "../domain/package-manifest";
import {
  type PackageSpec,
  type VersionReference,
  makePackageSpec,
  splitPackageSpec,
} from "../domain/package-spec";
import { PackageUrl } from "../domain/package-url";
import type { ResolvePackumentVersionError } from "../domain/packument";
import {
  type UnityProjectManifest,
  addTestable,
  hasDependency,
  mapScopedRegistry,
} from "../domain/project-manifest";
import { recordEntries } from "../domain/record-utils";
import { type Registry } from "../domain/registry";
import { type RegistryUrl, unityRegistryUrl } from "../domain/registry-url";
import {
  addScope,
  makeEmptyScopedRegistryFor,
} from "../domain/scoped-registry";
import { SemanticVersion } from "../domain/semantic-version";
import { isZod } from "../domain/zod-utils";
import type { ReadTextFile, WriteTextFile } from "../io/fs";
import { type GetRegistryPackument } from "../io/registry";
import type { CheckUrlExists } from "../io/www";
import { loadProjectManifestUsing } from "./get-dependencies";
import {
  type ResolvedPackumentVersion,
  fetchRegistryPackumentVersionUsing,
} from "./get-registry-packument-version";
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
    public readonly packageSpec: PackageSpec,
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
    public readonly packageSpec: PackageSpec,
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
    public readonly packageSpec: PackageSpec
  ) {
    super();
  }
}

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
 * @param sources The sources from which to resolve the packuments.
 * @param force Whether to force add the dependencies.
 * @param shouldAddTestable Whether to also add dependencies to the `testables`.
 * @param packageSpecs Specs of the dependencies to add.
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
  sources: ReadonlyArray<Registry>,
  force: boolean,
  shouldAddTestable: boolean,
  packageSpecs: ReadonlyArray<PackageSpec>
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
    fetchRegistryPackumentVersionUsing,
    fetchPackument
  );

  const resolveDependencies = partialApply(
    resolveDependenciesUsing,
    checkUrlExists,
    fetchPackument
  );

  async function resolveScopesFor(
    packageName: DomainName,
    verison: SemanticVersion,
    source: RegistryUrl
  ): Promise<Readonly<Record<RegistryUrl, ReadonlyArray<DomainName>>>> {
    if (source === unityRegistryUrl) return {};

    await debugLog(`fetch: ${makePackageSpec(packageName, verison)}`);

    const dependencyGraph = await resolveDependencies(
      sources,
      packageName,
      verison,
      true
    );

    const unresolvedDependencies = Array.of<UnresolvedDependency>();
    const scopes: Record<RegistryUrl, DomainName[]> = {};
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

      const dependencyRef = makePackageSpec(dependencyName, dependencyVersion);
      await logResolvedDependency(debugLog, dependencyRef, dependency.source);

      const isUnityPackage =
        dependency.source === "built-in" ||
        dependency.source === unityRegistryUrl;
      if (isUnityPackage) continue;

      if (!(dependency.source in scopes)) scopes[dependency.source] = [];
      scopes[dependency.source]!.push(dependencyName);
    }

    // print suggestion for depsInvalid
    if (unresolvedDependencies.length > 0 && !force)
      throw new UnresolvedDependenciesError(
        makePackageSpec(packageName, verison),
        unresolvedDependencies
      );

    return scopes;
  }

  async function resolveDependency(
    packageName: DomainName,
    requestedVersion: Exclude<VersionReference, PackageUrl>
  ): Promise<[SemanticVersion, RegistryUrl]> {
    let versionToAdd = requestedVersion;

    let totalResolveResult: Result<
      ResolvedPackumentVersion,
      ResolvePackumentVersionError
    > = Err(new PackumentNotFoundError(packageName));

    for (const source of sources) {
      const resolveResult = await getRegistryPackumentVersion(
        packageName,
        requestedVersion,
        source
      ).promise;

      if (resolveResult.isOk()) {
        totalResolveResult = resolveResult;
        break;
      } else {
        totalResolveResult = pickMostFixable(totalResolveResult, resolveResult);
      }
    }

    if (totalResolveResult.isErr()) throw totalResolveResult.error;

    const packumentVersion = totalResolveResult.value.packumentVersion;
    const source = totalResolveResult.value.source;
    versionToAdd = packumentVersion.version;

    // Only do compatibility check when we have a editor version to check against
    if (editorVersion !== null) {
      let targetEditorVersion: EditorVersion | null;
      try {
        targetEditorVersion = tryGetTargetEditorVersionFor(packumentVersion);
      } catch (error) {
        if (!force) {
          const packageSpec = makePackageSpec(packageName, versionToAdd);
          await debugLog(
            `"${packageSpec}" is malformed. Target editor version could not be determined.`
          );
          throw new CompatibilityCheckFailedError(packageSpec);
        }
        targetEditorVersion = null;
      }

      // verify editor version
      const isCompatible =
        targetEditorVersion === null ||
        compareEditorVersion(editorVersion, targetEditorVersion) >= 0;
      if (!isCompatible && !force)
        throw new PackageIncompatibleError(
          makePackageSpec(packageName, versionToAdd),
          targetEditorVersion!
        );
    }

    return [versionToAdd, source];
  }

  async function addSingle(
    manifest: UnityProjectManifest,
    packageName: DomainName,
    requestedVersion: VersionReference
  ): Promise<[UnityProjectManifest, AddResult]> {
    if (shouldAddTestable) manifest = addTestable(manifest, packageName);

    if (isZod(requestedVersion, PackageUrl))
      return addProjectDependency(manifest, packageName, requestedVersion);

    const [versionToAdd, source] = await resolveDependency(
      packageName,
      requestedVersion
    );

    const scopesBySource = await resolveScopesFor(
      packageName,
      versionToAdd,
      source
    );

    recordEntries(scopesBySource).forEach(([scopeSource, scopes]) => {
      manifest = mapScopedRegistry(manifest, scopeSource, (initial) => {
        let updated = initial ?? makeEmptyScopedRegistryFor(scopeSource);

        updated = scopes.reduce(addScope, updated!);

        return updated;
      });
    });

    if (shouldAddTestable) manifest = addTestable(manifest, packageName);

    return addProjectDependency(manifest, packageName, versionToAdd);
  }

  let manifest = await loadProjectManifest(projectDirectory);

  const results: Record<DomainName, AddResult> = {};
  for (const packageSpec of packageSpecs) {
    const [packageName, version] = splitPackageSpec(packageSpec);
    const [newManifest, result] = await addSingle(
      manifest,
      packageName,
      // If no version was specified we resolve latest
      version ?? "latest"
    );
    manifest = newManifest;
    results[packageName] = result;
  }

  await saveProjectManifest(projectDirectory, manifest);

  return results;
}
