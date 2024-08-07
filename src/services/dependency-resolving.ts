import { DomainName } from "../domain/domain-name";
import { SemanticVersion } from "../domain/semantic-version";
import { Registry } from "../domain/registry";
import { CheckIsBuiltInPackage } from "./built-in-package-check";
import {
  ResolvePackumentVersionError,
  tryResolvePackumentVersion,
} from "../domain/packument";
import { FetchPackument } from "../io/packument-io";
import { PackumentNotFoundError } from "../common-errors";
import {
  DependencyGraph,
  makeGraphFromSeed,
  markBuiltInResolved,
  markFailed,
  markRemoteResolved,
  tryGetNextUnresolved,
} from "../domain/dependency-graph";
import { RegistryUrl } from "../domain/registry-url";

/**
 * Function for resolving all dependencies for a package.
 * @param sources Sources from which dependencies can be resolved.
 * @param packageName The name of the package.
 * @param version The version for which to search dependencies.
 * @param deep Whether to search for all dependencies.
 */
export type ResolveDependencies = (
  sources: ReadonlyArray<Registry>,
  packageName: DomainName,
  version: SemanticVersion,
  deep: boolean
) => Promise<DependencyGraph>;

/**
 * Makes a {@link ResolveDependencies} function.
 */
export function makeResolveDependency(
  fetchPackument: FetchPackument,
  checkIsBuiltInPackage: CheckIsBuiltInPackage
): ResolveDependencies {
  async function resolveRecursively(
    graph: DependencyGraph,
    sources: ReadonlyArray<Registry>,
    deep: boolean
  ): Promise<DependencyGraph> {
    const nextUnresolved = tryGetNextUnresolved(graph);
    if (nextUnresolved === null) return graph;

    const [packageName, version] = nextUnresolved;

    const isBuiltIn = await checkIsBuiltInPackage(packageName, version);
    if (isBuiltIn) {
      graph = markBuiltInResolved(graph, packageName, version);
      return graph;
    }

    const errors: Record<RegistryUrl, ResolvePackumentVersionError> = {};
    for (const source of sources) {
      const packument = await fetchPackument(source, packageName);
      if (packument === null) {
        errors[source.url] = new PackumentNotFoundError(packageName);
        continue;
      }

      const packumentVersionResult = tryResolvePackumentVersion(
        packument,
        version
      );
      if (packumentVersionResult.isErr()) {
        errors[source.url] = packumentVersionResult.error;
        continue;
      }

      const dependencies = packumentVersionResult.value.dependencies ?? {};
      graph = markRemoteResolved(
        graph,
        packageName,
        version,
        source.url,
        dependencies
      );
      if (!deep) return graph;

      return await resolveRecursively(graph, sources, deep);
    }

    graph = markFailed(graph, packageName, version, errors);
    return graph;
  }

  return (sources, packageName, version, deep) =>
    resolveRecursively(makeGraphFromSeed(packageName, version), sources, deep);
}
