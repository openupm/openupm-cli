import { ResolvePackumentVersionError } from "../packument-version-resolving";
import { DomainName } from "./domain-name";
import { SemanticVersion } from "./semantic-version";
import { RegistryUrl } from "./registry-url";
import { recordEntries } from "../utils/record-utils";

export enum NodeType {
  Unresolved,
  Resolved,
  Failed,
}

type UnresolvedNode = Readonly<{
  type: NodeType.Unresolved;
}>;

type ResolvedNode = Readonly<{
  type: NodeType.Resolved;
  source: RegistryUrl | "built-in";
  dependencies: Readonly<Record<DomainName, SemanticVersion>>;
}>;

type FailedNode = Readonly<{
  type: NodeType.Failed;
  error: ResolvePackumentVersionError;
}>;

type GraphNode = UnresolvedNode | ResolvedNode | FailedNode;

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

export function tryGetNextUnresolved(
  graph: DependencyGraph
): readonly [DomainName, SemanticVersion] | null {
  for (const [packageName, version, node] of traverseDependencyGraph(graph)) {
    if (node.type === NodeType.Unresolved)
      return [packageName, version] as const;
  }
  return null;
}

export function markBuiltInResolved(
  graph: DependencyGraph,
  packageName: DomainName,
  version: SemanticVersion
): DependencyGraph {
  return putNode(graph, packageName, version, builtInNode);
}

export function markRemoteResolved(
  graph: DependencyGraph,
  packageName: DomainName,
  version: SemanticVersion,
  source: RegistryUrl,
  dependencies: Readonly<Record<DomainName, SemanticVersion>>
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

export function markFailed(
  graph: DependencyGraph,
  packageName: DomainName,
  version: SemanticVersion,
  error: ResolvePackumentVersionError
): DependencyGraph {
  return putNode(graph, packageName, version, { type: NodeType.Failed, error });
}

export function tryGetGraphNode(
  graph: DependencyGraph,
  packageName: DomainName,
  version: SemanticVersion
): GraphNode | null {
  return graph[packageName]?.[version] ?? null;
}

export function graphNodeCount(graph: DependencyGraph): number {
  return Object.values(graph)
    .map(Object.keys)
    .map((it) => it.length)
    .reduce((a, b) => a + b, 0);
}
