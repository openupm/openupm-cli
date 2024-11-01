import { PackumentNotFoundError } from "../domain/common-errors.js";
import {
  DependencyGraph,
  makeGraphFromSeed,
  markBuiltInResolved,
  markFailed,
  markRemoteResolved,
  tryGetNextUnresolved,
} from "../domain/dependency-graph.js";
import { DomainName } from "../domain/domain-name.js";
import { partialApply } from "../domain/fp-utils.js";
import {
  ResolvePackumentVersionError,
  tryResolvePackumentVersion,
} from "../domain/packument.js";
import { Registry } from "../domain/registry.js";
import { RegistryUrl } from "../domain/registry-url.js";
import { SemanticVersion } from "../domain/semantic-version.js";
import type { GetRegistryPackument } from "../io/registry.js";
import { type CheckUrlExists } from "../io/www.js";
import { checkIsBuiltInPackageUsing } from "./built-in-package-check.js";

/**
 * Resolves all dependencies for a package.
 * @param checkUrlExists IO function for checking whether a package exists.
 * @param getRegistryPackument IO function for fetching a registry packument.
 * @param sources Sources from which dependencies can be resolved.
 * @param packageName The name of the package.
 * @param version The version for which to search dependencies.
 * @param deep Whether to search for all dependencies.
 */
export function resolveDependenciesUsing(
  checkUrlExists: CheckUrlExists,
  getRegistryPackument: GetRegistryPackument,
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
      graph = markRemoteResolved(
        graph,
        currentPackageName,
        currentVersion,
        source.url,
        dependencies
      );
      if (!deep) return graph;

      return await resolveRecursively(graph);
    }

    graph = markFailed(graph, currentPackageName, currentVersion, errors);
    return await resolveRecursively(graph);
  }

  return resolveRecursively(makeGraphFromSeed(packageName, version));
}
