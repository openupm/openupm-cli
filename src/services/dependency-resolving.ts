import { DomainName } from "../domain/domain-name";
import { SemanticVersion } from "../domain/semantic-version";
import { Registry } from "../domain/registry";
import { CheckIsBuiltInPackage } from "./built-in-package-check";
import { tryResolvePackumentVersion } from "../domain/packument";
import { FetchPackument } from "../io/packument-io";
import { PackumentNotFoundError } from "../common-errors";
import { recordEntries } from "../utils/record-utils";
import {
  DependencyGraph,
  emptyDependencyGraph,
  graphHasNodeAt,
  setGraphNode,
} from "../domain/dependency-graph";

type NameVersionPair = Readonly<[DomainName, SemanticVersion]>;

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
    packagesToCheck: ReadonlyArray<NameVersionPair>,
    deep: boolean
  ): Promise<DependencyGraph> {
    if (packagesToCheck.length === 0) return graph;

    const [packageName, version] = packagesToCheck[0]!;
    if (graphHasNodeAt(graph, packageName, version))
      return await resolveRecursively(
        graph,
        sources,
        packagesToCheck.slice(1),
        deep
      );

    const isBuiltIn = await checkIsBuiltInPackage(packageName, version);
    if (isBuiltIn)
      return setGraphNode(graph, packageName, version, {
        resolved: true,
        source: "built-in",
        dependencies: {},
      });

    for (const source of sources) {
      const packument = await fetchPackument(source, packageName);
      if (packument === null) continue;

      const packumentVersionResult = tryResolvePackumentVersion(
        packument,
        version
      );
      if (packumentVersionResult.isErr())
        return setGraphNode(graph, packageName, version, {
          resolved: false,
          error: packumentVersionResult.error,
        });
      const dependencies = packumentVersionResult.value.dependencies ?? {};
      const updatedGraph = setGraphNode(graph, packageName, version, {
        resolved: true,
        source: source.url,
        dependencies,
      });
      if (!deep) return updatedGraph;

      return await resolveRecursively(
        graph,
        sources,
        [...packagesToCheck.slice(1), ...recordEntries(dependencies)],
        deep
      );
    }

    return setGraphNode(graph, packageName, version, {
      resolved: false,
      error: new PackumentNotFoundError(packageName),
    });
  }

  return (sources, packageName, version, deep) =>
    resolveRecursively(emptyDependencyGraph, sources, [[packageName, version]], deep);
}
