import { Chalk } from "chalk";
import { PackumentNotFoundError } from "../domain/common-errors";
import {
  DependencyGraph,
  FailedNode,
  GraphNode,
  NodeType,
  ResolvedNode,
  tryGetGraphNode,
} from "../domain/dependency-graph";
import { DomainName } from "../domain/domain-name";
import {
  makePackageReference,
  PackageReference,
} from "../domain/package-reference";
import {
  ResolvePackumentVersionError,
  VersionNotFoundError,
} from "../domain/packument";
import { RegistryUrl, unityRegistryUrl } from "../domain/registry-url";
import { SemanticVersion } from "../domain/semantic-version";
import { DebugLog } from "../domain/logging";
import { recordEntries } from "../domain/record-utils";

/**
 * Logs information about a resolved dependency to a logger.
 */
export async function logResolvedDependency(
  debugLog: DebugLog,
  packageRef: PackageReference,
  source: RegistryUrl | "built-in"
) {
  const tag =
    source === "built-in"
      ? "[internal] "
      : source === unityRegistryUrl
      ? "[unity]"
      : "";
  const message = `${packageRef} ${tag}`;
  await debugLog(message);
}

/**
 * Stringifies a dependency graph for output.
 * @param graph The graph.
 * @param rootPackage The name of the graphs root package.
 * @param rootVersion The version of the graphs root package.
 * @param chalk Used for coloring output. Omit if no color should be used.
 * @returns A string array representing the graph. Each string is a line.
 */
export function stringifyDependencyGraph(
  graph: DependencyGraph,
  rootPackage: DomainName,
  rootVersion: SemanticVersion,
  chalk?: Chalk
): readonly string[] {
  const printedRefs = new Set<PackageReference>();

  function tryColor(chalk: Chalk | undefined, s: string) {
    return chalk !== undefined ? chalk(s) : s;
  }

  function getNode(
    packageName: DomainName,
    version: SemanticVersion
  ): GraphNode {
    const node = tryGetGraphNode(graph, packageName, version);
    if (node === null)
      throw new RangeError(
        `Dependency graph did not contain a node for ${makePackageReference(
          rootPackage,
          rootVersion
        )}`
      );
    return node;
  }

  function makeErrorMessageFor(error: ResolvePackumentVersionError): string {
    switch (error.constructor) {
      case PackumentNotFoundError:
        return "package not found";
      case VersionNotFoundError:
        return "version not found";
      default:
        return "unknown";
    }
  }

  function makeDuplicateLine(packageRef: PackageReference): string {
    return tryColor(chalk?.blueBright, `${packageRef} ..`);
  }

  function makeErrorLines(errors: FailedNode["errors"]): readonly string[] {
    // Each error gets a line
    return recordEntries(errors).map(([sourceUrl, error]) => {
      const message = makeErrorMessageFor(error);
      // With the source url and a message describing the error
      return `  - "${sourceUrl}": ${message}`;
    });
  }

  function makeDependencyLines(
    dependencies: ResolvedNode["dependencies"]
  ): readonly string[] {
    const dependencyBlocks = recordEntries(dependencies).map(
      ([dependencyName, dependencyVersion]) =>
        stringifyRecursively(dependencyName, dependencyVersion)
    );
    return dependencyBlocks.flatMap((block, blockIndex) => {
      const isLastBlock = blockIndex >= dependencyBlocks.length - 1;
      return block.map((line, lineIndex) => {
        const isFirstLine = lineIndex === 0;
        const prefix =
          // The first line of a dependency block has the "arrow" in order
          // to branch of from the parent
          isFirstLine
            ? "└─ "
            : // The other lines have different symbols depending on whether
            // there are more blocks following.
            isLastBlock
            ? // If there are no more blocks then no symbol.
              "   "
            : // Otherwise draw a line down from the parent so that the
              // next block's arrow can connect to it.
              "│  ";
        return prefix + line;
      });
    });
  }

  function stringifyRecursively(
    packageName: DomainName,
    version: SemanticVersion
  ): readonly string[] {
    const node = getNode(packageName, version);
    const packageRef = makePackageReference(packageName, version);

    // We only print package@version once. If two packages depend on the
    // same package@version, we print a short version of it.
    const isDuplicate = printedRefs.has(packageRef);
    if (isDuplicate) return [makeDuplicateLine(packageRef)];
    else printedRefs.add(packageRef);

    if (node.type === NodeType.Unresolved)
      // package@version
      return [packageRef];

    if (node.type === NodeType.Failed) {
      /*
        package@version
         -  url1: version not found
         -  url2: package not found
       */
      const errorLines = makeErrorLines(node.errors);
      return [tryColor(chalk?.red, packageRef), ...errorLines];
    }

    // Resolved node
    /*
      package@version
      └─ dependency@version
     */
    const dependencyLines = makeDependencyLines(node.dependencies);
    return [packageRef, ...dependencyLines];
  }

  return stringifyRecursively(rootPackage, rootVersion);
}
