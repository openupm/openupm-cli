import { PackumentNotFoundError } from "../domain/common-errors";
import {
  DependencyGraph,
  makeGraphFromSeed,
  markBuiltInResolved,
  markFailed,
  markRemoteResolved,
  tryGetNextUnresolved,
} from "../domain/dependency-graph";
import { DomainName } from "../domain/domain-name";
import { partialApply } from "../domain/fp-utils";
import { type WarnLog } from "../domain/logging";
import {
  ResolvePackumentVersionError,
  tryResolvePackumentVersion,
} from "../domain/packument";
import { recordEntries } from "../domain/record-utils";
import { Registry } from "../domain/registry";
import { RegistryUrl } from "../domain/registry-url";
import { SemanticVersion } from "../domain/semantic-version";
import { isZod } from "../domain/zod-utils";
import type { GetRegistryPackument } from "../io/registry";
import { type CheckUrlExists } from "../io/www";
import { checkIsBuiltInPackageUsing } from "./built-in-package-check";

/**
 * Resolves all dependencies for a package.
 * @param checkUrlExists IO function for checking whether a package exists.
 * @param getRegistryPackument IO function for fetching a registry packument.
 * @param warnLog IO function for logging user-facing warnings.
 * @param sources Sources from which dependencies can be resolved.
 * @param packageName The name of the package.
 * @param version The version for which to search dependencies.
 * @param deep Whether to search for all dependencies.
 */
export function resolveDependenciesUsing(
  checkUrlExists: CheckUrlExists,
  getRegistryPackument: GetRegistryPackument,
  warnLog: WarnLog,
  sources: ReadonlyArray<Registry>,
  packageName: DomainName,
  version: SemanticVersion,
  deep: boolean
): Promise<DependencyGraph> {
  const checkIsBuiltInPackage = partialApply(
    checkIsBuiltInPackageUsing,
    checkUrlExists,
    getRegistryPackument
  );

  async function resolveRecursively(
    graph: DependencyGraph
  ): Promise<DependencyGraph> {
    const nextUnresolved = tryGetNextUnresolved(graph);
    if (nextUnresolved === null) return graph;

    const [currentPackageName, currentVersion] = nextUnresolved;

    const isBuiltIn = await checkIsBuiltInPackage(
      currentPackageName,
      currentVersion
    );
    if (isBuiltIn) {
      graph = markBuiltInResolved(graph, currentPackageName, currentVersion);
      return await resolveRecursively(graph);
    }

    const errors: Record<RegistryUrl, ResolvePackumentVersionError> = {};
    for (const source of sources) {
      const packument = await getRegistryPackument(source, currentPackageName);
      if (packument === null) {
        errors[source.url] = new PackumentNotFoundError(currentPackageName);
        continue;
      }

      const packumentVersionResult = tryResolvePackumentVersion(
        packument,
        currentVersion
      );
      if (packumentVersionResult.isErr()) {
        errors[source.url] = packumentVersionResult.error;
        continue;
      }

      const dependencies = packumentVersionResult.value.dependencies ?? {};
      const validDependencies = await makeValidDependencies(
        dependencies,
        currentPackageName,
        currentVersion,
        warnLog
      );
      graph = markRemoteResolved(
        graph,
        currentPackageName,
        currentVersion,
        source.url,
        validDependencies
      );
      if (!deep) return graph;

      return await resolveRecursively(graph);
    }

    graph = markFailed(graph, currentPackageName, currentVersion, errors);
    return await resolveRecursively(graph);
  }

  return resolveRecursively(makeGraphFromSeed(packageName, version));
}

/**
 * Filters out dependencies whose names or versions are invalid.
 * Registry packuments are untrusted input, so dependency names and versions
 * must be validated before they are used to build package specs or dependency
 * graphs. Invalid dependencies are skipped with a warning, which matches how
 * the Unity Package Manager handles them.
 * @param dependencies The dependencies declared by a package version.
 * @param packageName The name of the package that declares the dependencies.
 * @param version The version of the package that declares the dependencies.
 * @param warnLog IO function for logging user-facing warnings.
 */
async function makeValidDependencies(
  dependencies: Readonly<Record<DomainName, SemanticVersion>>,
  packageName: DomainName,
  version: SemanticVersion,
  warnLog: WarnLog
): Promise<Record<DomainName, SemanticVersion>> {
  const validDependencies: Record<DomainName, SemanticVersion> = {};
  for (const [dependencyName, dependencyVersion] of recordEntries(
    dependencies
  )) {
    if (
      !isZod(dependencyName, DomainName) ||
      !isZod(dependencyVersion, SemanticVersion)
    ) {
      await warnLog(
        `Skipping invalid dependency "${dependencyName}": "${dependencyVersion}" declared by "${packageName}@${version}". Dependency names and versions must follow the Unity package naming and semantic versioning rules. Report this to the package author.`
      );
      continue;
    }
    validDependencies[dependencyName] = dependencyVersion;
  }
  return validDependencies;
}
