import { DomainName } from "./domain-name.js";
import { ResolvePackumentVersionError } from "./packument.js";
import { recordEntries } from "./record-utils.js";
import { RegistryUrl } from "./registry-url.js";
import { SemanticVersion } from "./semantic-version.js";

export enum NodeType {
  Unresolved,
  Resolved,
  Failed,
}

type UnresolvedNode = Readonly<{
  type: NodeType.Unresolved;
}>;

/**
 * A resolved node in a {@link DependencyGraph}.
 */
export type ResolvedNode = Readonly<{
  /**
   * Indicates that the node is resolved.
   */
  type: NodeType.Resolved;
  /**
   * The source from which the dependency was resolved. Either the url of the
   * source registry or "built-in".
   */
  source: RegistryUrl | "built-in";
  /**
   * A map of dependencies for this node.
   */
  dependencies: Readonly<Record<DomainName, SemanticVersion>>;
}>;

/**
 * A node in a {@link DependencyGraph} representing a package that could
 * not be resolved.
 */
export type FailedNode = Readonly<{
  /**
   * Marks this node as failed.
   */
  type: NodeType.Failed;
  /**
   * Map of errors which caused the package resolve to fail. They are keyed
   * by the registry url for which the error occurred.
   */
  errors: Readonly<Record<RegistryUrl, ResolvePackumentVersionError>>;
}>;

/**
 * A node in a {@link DependencyGraph}.
 */
export type GraphNode = UnresolvedNode | ResolvedNode | FailedNode;

/**
 * A graph indicating which packages depend on which others.
 */
export type DependencyGraph = Readonly<
  Record<DomainName, Readonly<Record<SemanticVersion, GraphNode>>>
>;

const unresolvedNode: GraphNode = { type: NodeType.Unresolved };

const builtInNode: GraphNode = {
  type: NodeType.Resolved,
  source: "built-in",
  dependencies: {},
};

function putNode(
  graph: DependencyGraph,
  packageName: DomainName,
  version: SemanticVersion,
  node: GraphNode
): DependencyGraph {
  return {
    ...graph,
    [packageName]: {
      ...graph[packageName],
      [version]: node,
    },
  };
}

function tryPutNode(
  graph: DependencyGraph,
  packageName: DomainName,
  version: SemanticVersion,
  node: GraphNode
): DependencyGraph {
  return {
    ...graph,
    [packageName]: {
      [version]: node,
      ...graph[packageName],
    },
  };
}

/**
 * Flattens a dependency tree down into a linear array of entries.
 * @param graph The graph to flatten.
 * @yields All nodes in the graph in a linear array.
 */
export function* traverseDependencyGraph(
  graph: DependencyGraph
): Generator<readonly [DomainName, SemanticVersion, GraphNode]> {
  for (const [packageName, versions] of recordEntries(graph))
    for (const [version, node] of recordEntries(versions))
      yield [packageName, version, node] as const;
}

/**
 * Makes a new dependency graph with a single unresolved node.
 * @param packageName The initial package name.
 * @param version The initial version.
 */
export function makeGraphFromSeed(
  packageName: DomainName,
  version: SemanticVersion
): DependencyGraph {
  return putNode({}, packageName, version, unresolvedNode);
}

/**
 * Attempts to get the next unresolved package-spec from a dependency
 * graph.
 * @param graph The graph to search.
 * @returns A tuple with the name and version of the next unresolved package or
 * null if there are no unresolved packages in the graph.
 */
export function tryGetNextUnresolved(
  graph: DependencyGraph
): readonly [DomainName, SemanticVersion] | null {
  for (const [packageName, version, node] of traverseDependencyGraph(graph)) {
    if (node.type === NodeType.Unresolved)
      return [packageName, version] as const;
  }
  return null;
}

/**
 * Marks a node in a graph as a built-in package. This will also resolve it.
 * @param graph The graph.
 * @param packageName The name of the package to resolve.
 * @param version The version of the package to resolve.
 * @returns The updated graph.
 */
export function markBuiltInResolved(
  graph: DependencyGraph,
  packageName: DomainName,
  version: SemanticVersion
): DependencyGraph {
  return putNode(graph, packageName, version, builtInNode);
}

/**
 * Marks a node in a dependency graph as resolved from a remote registry.
 * @param graph The graph.
 * @param packageName The name of the package that was resolved.
 * @param version The version of the package that was resolved.
 * @param source The url of the registry from which the package was resolved.
 * @param dependencies A record of the packages dependencies. These will be
 * marked as unresolved in the graph, if they were not resolved previously.
 * @returns The updated graph.
 */
export function markRemoteResolved(
  graph: DependencyGraph,
  packageName: DomainName,
  version: SemanticVersion,
  source: RegistryUrl,
  dependencies: ResolvedNode["dependencies"]
): DependencyGraph {
  // Mark package resolved
  graph = putNode(graph, packageName, version, {
    type: NodeType.Resolved,
    source,
    dependencies,
  });
  // Mark dependencies unresolved
  return recordEntries(dependencies).reduce(
    (graph, [depName, depVersion]) =>
      tryPutNode(graph, depName, depVersion, unresolvedNode),
    graph
  );
}

/**
 * Marks a package that could not be resolved in a dependency graph.
 * @param graph The graph.
 * @param packageName The name of the package.
 * @param version The version of the package.
 * @param errors The errors that prevented the package from being resolved.
 * They are stored in record form, keyed by the registry url with which
 * the error is associated.
 */
export function markFailed(
  graph: DependencyGraph,
  packageName: DomainName,
  version: SemanticVersion,
  errors: FailedNode["errors"]
): DependencyGraph {
  return putNode(graph, packageName, version, {
    type: NodeType.Failed,
    errors,
  });
}

/**
 * Attempts to get the node for a package from a dependency graph.
 * @param graph The graph.
 * @param packageName The name of the package.
 * @param version The package version.
 * @returns The package node or null if the graph has no node for this package.
 */
export function tryGetGraphNode(
  graph: DependencyGraph,
  packageName: DomainName,
  version: SemanticVersion
): GraphNode | null {
  return graph[packageName]?.[version] ?? null;
}

/**
 * Counts the nodes in the graph.
 * @param graph The graph.
 * @returns A natural integer.
 */
export function graphNodeCount(graph: DependencyGraph): number {
  return Object.values(graph)
    .map(Object.keys)
    .map((it) => it.length)
    .reduce((a, b) => a + b, 0);
}
