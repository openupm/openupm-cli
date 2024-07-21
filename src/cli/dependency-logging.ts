import {
  makePackageReference,
  PackageReference,
} from "../domain/package-reference";
import { RegistryUrl, unityRegistryUrl } from "../domain/registry-url";
import { DebugLog } from "../logging";
import { recordEntries } from "../utils/record-utils";
import { Logger } from "npmlog";
import { DomainName } from "../domain/domain-name";
import { SemanticVersion } from "../domain/semantic-version";
import {
  DependencyGraph,
  FailedNode,
  NodeType,
  tryGetGraphNode,
} from "../domain/dependency-graph";
import { ResolvePackumentVersionError } from "../domain/packument";
import { PackumentNotFoundError } from "../common-errors";

/**
 * Logs information about a resolved dependency to a logger.
 */
export function logResolvedDependency(
  debugLog: DebugLog,
  packageRef: PackageReference,
  source: RegistryUrl | "built-in"
) {
  const tag =
    source === "built-in"
      ? "[internal] "
      : source === unityRegistryUrl
      ? "[upstream]"
      : "";
  const message = `${packageRef} ${tag}`;
  debugLog(message);
}

function errorMessageFor(error: ResolvePackumentVersionError): string {
  if (error instanceof PackumentNotFoundError) return "package not found";
  else return "version not found";
}

/**
 * Prints information about a dependency that could not be resolved to a logger.
 * @param log The logger to print to.
 * @param dependencyName The name of the dependency.
 * @param dependencyVersion The version of the dependency.
 * @param dependency The failed node from the dependency graph.
 */
export function logFailedDependency(
  log: Logger,
  dependencyName: DomainName,
  dependencyVersion: SemanticVersion,
  dependency: FailedNode
) {
  log.warn(
    "",
    `Failed to resolve dependency "${dependencyName}@${dependencyVersion}"`
  );
  recordEntries(dependency.errors).forEach(([errorSource, error]) =>
    log.warn("", `  - "${errorSource}": ${errorMessageFor(error)}`)
  );
}

/**
 * Stringifies a dependency graph for output.
 * @param graph The graph.
 * @param rootPackage The name of the graphs root package.
 * @param rootVersion The version of the graphs root package.
 * @returns A string array representing the graph. Each string is a line.
 */
export function stringifyDependencyGraph(
  graph: DependencyGraph,
  rootPackage: DomainName,
  rootVersion: SemanticVersion
): readonly string[] {
  const printedRefs = new Set<PackageReference>();

  function stringifyRecursively(
    packageName: DomainName,
    version: SemanticVersion
  ): readonly string[] {
    const node = tryGetGraphNode(graph, packageName, version);
    if (node === null)
      throw new RangeError(
        `Dependency graph did not contain a node for ${makePackageReference(
          rootPackage,
          rootVersion
        )}`
      );

    const packageRef = makePackageReference(packageName, version);

    if (printedRefs.has(packageRef)) return [`${packageRef} ..`];
    else printedRefs.add(packageRef);

    if (node.type === NodeType.Unresolved) return [packageRef];

    if (node.type === NodeType.Failed) {
      const errorLines = recordEntries(node.errors).flatMap(
        ([sourceUrl, error]) => {
          const message =
            error instanceof PackumentNotFoundError
              ? "package not found"
              : "version not found";
          return `  - "${sourceUrl}": ${message}`;
        }
      );
      return [packageRef, ...errorLines];
    }

    const dependencyBlocks = recordEntries(node.dependencies).map(
      ([dependencyName, dependencyVersion]) =>
        stringifyRecursively(dependencyName, dependencyVersion)
    );
    const dependencyLines = dependencyBlocks.flatMap((block, blockIndex) =>
      block.map((line, lineIndex) => {
        const prefix =
          lineIndex === 0
            ? "└─ "
            : blockIndex < dependencyBlocks.length - 1
            ? "│  "
            : "   ";
        return prefix + line;
      })
    );

    return [packageRef, ...dependencyLines];
  }

  return stringifyRecursively(rootPackage, rootVersion);
}
