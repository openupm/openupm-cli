import { ResolvePackumentVersionError } from "../packument-version-resolving";
import { DomainName } from "./domain-name";
import { SemanticVersion } from "./semantic-version";
import { RegistryUrl } from "./registry-url";
import { recordEntries } from "../utils/record-utils";

type ResolvedNode = Readonly<{
  resolved: true;
  source: RegistryUrl | "built-in";
  dependencies: Readonly<Record<DomainName, SemanticVersion>>;
}>;
type UnresolvedNode = Readonly<{
  resolved: false;
  error: ResolvePackumentVersionError;
}>;
type GraphNode = ResolvedNode | UnresolvedNode;

/**
 * A graph indicating which packages depend on which others.
 * Dependencies are keyed first by their name and then version.
 * @example
 * {
 *   "com.some.package": {
 *     "1.0.0": {
 *       resolved: true,
 *       source: "https://package.openupm.com",
 *       dependencies: { "com.other.package": "2.0.0" }
 *     }
 *   },
 *   "com.other.package": {
 *     "2.0.0": {
 *       resolved: true,
 *       source: "https://package.openupm.com",
 *       dependencies: { }
 *     }
 *   }
 * }
 */
export type DependencyGraph = Readonly<
  Record<DomainName, Readonly<Record<SemanticVersion, GraphNode>>>
>;

/**
 * An empty dependency graph.
 */
export const emptyDependencyGraph: DependencyGraph = {};

/**
 * Add or replace a node in the graph.
 * @param graph The graph.
 * @param packageName The key package name.
 * @param version The key version.
 * @param node The new node.
 * @returns The updated graph.
 */
export function setGraphNode(
  graph: DependencyGraph,
  packageName: DomainName,
  version: SemanticVersion,
  node: GraphNode
): DependencyGraph {
  return {
    ...graph,
    [packageName]: { ...graph[packageName], [version]: node },
  };
}

/**
 * Checks whether a graph has a node at the given key.
 * @param graph The graph.
 * @param packageName The key package name.
 * @param version The key version.
 */
export function graphHasNodeAt(
  graph: DependencyGraph,
  packageName: DomainName,
  version: SemanticVersion
): boolean {
  return graph[packageName]?.[version] !== undefined;
}

/**
 * Flattens a dependency tree down into a linear array of entries.
 * @param graph The graph to flatten.
 * @returns All nodes in the graph in a linear array.
 */
export function flattenDependencyGraph(
  graph: DependencyGraph
): ReadonlyArray<readonly [DomainName, SemanticVersion, GraphNode]> {
  return recordEntries(graph).flatMap(([dependencyName, versions]) =>
    recordEntries(versions).map(
      ([dependencyVersion, dependency]) =>
        [dependencyName, dependencyVersion, dependency] as const
    )
  );
}
