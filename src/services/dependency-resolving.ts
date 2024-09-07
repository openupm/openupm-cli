import RegClient from "another-npm-registry-client";
import { PackumentNotFoundError } from "../common-errors";
import {
  DependencyGraph,
  makeGraphFromSeed,
  markBuiltInResolved,
  markFailed,
  markRemoteResolved,
  tryGetNextUnresolved,
} from "../domain/dependency-graph";
import { DomainName } from "../domain/domain-name";
import {
  ResolvePackumentVersionError,
  tryResolvePackumentVersion,
} from "../domain/packument";
import { Registry } from "../domain/registry";
import { RegistryUrl } from "../domain/registry-url";
import { SemanticVersion } from "../domain/semantic-version";
import {
  GetRegistryPackument,
  getRegistryPackumentUsing,
} from "../io/packument-io";
import { DebugLog } from "../logging";
import {
  checkIsBuiltInPackage,
  CheckIsBuiltInPackage,
} from "./built-in-package-check";

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
 * Makes a {@link ResolveDependencies} function which resolves a dependency
 * graph by querying multiple source registries.
 */
export function ResolveDependenciesFromRegistries(
  getRegistryPackument: GetRegistryPackument,
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
      return await resolveRecursively(graph, sources, deep);
    }

    const errors: Record<RegistryUrl, ResolvePackumentVersionError> = {};
    for (const source of sources) {
      const packument = await getRegistryPackument(source, packageName);
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
    return await resolveRecursively(graph, sources, deep);
  }

  return (sources, packageName, version, deep) =>
    resolveRecursively(makeGraphFromSeed(packageName, version), sources, deep);
}

/**
 * Default {@link ResolveDependencies} function. Uses {@link ResolveDependenciesFromRegistries}.
 */
export const resolveDependencies = (
  registryClient: RegClient.Instance,
  debugLog: DebugLog
) =>
  ResolveDependenciesFromRegistries(
    getRegistryPackumentUsing(registryClient, debugLog),
    checkIsBuiltInPackage(registryClient, debugLog)
  );
