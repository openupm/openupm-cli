import { DomainName, isInternalPackage } from "../domain/domain-name";
import { isSemanticVersion, SemanticVersion } from "../domain/semantic-version";
import { addToCache, emptyPackumentCache } from "../packument-cache";
import {
  PackumentResolveError,
  pickMostFixable,
  ResolvableVersion,
  tryResolveFromCache,
} from "../packument-resolving";
import { RegistryUrl } from "../domain/registry-url";
import assert from "assert";
import { Registry } from "../domain/registry";
import { ResolveRemotePackumentService } from "./resolve-remote-packument";
import { areArraysEqual } from "../utils/array-utils";
import { dependenciesOf } from "../domain/package-manifest";

export type DependencyBase = {
  /**
   * The package name of the dependency.
   */
  readonly name: DomainName;
  /**
   * Whether this dependency is the root package for which dependencies were
   * requested.
   */
  readonly self: boolean;
};

/**
 * A dependency that was resolved successfully.
 */
export interface ValidDependency extends DependencyBase {
  /**
   * The source from which this dependency was resolved.
   */
  readonly source: RegistryUrl;
  /**
   * Whether this dependency is an internal package.
   */
  readonly internal: boolean;
  /**
   * The requested version.
   */
  readonly version: SemanticVersion;
}

/**
 * A dependency that could not be resolved.
 */
export interface InvalidDependency extends DependencyBase {
  reason: PackumentResolveError;
}

type NameVersionPair = Readonly<
  [DomainName, SemanticVersion | "latest" | undefined]
>;

/**
 * Service function for resolving all dependencies for a package.
 * @param registry The registry in which to search the dependencies.
 * @param upstreamRegistry The upstream registry in which to search as a backup.
 * @param name The name of the package.
 * @param version The version for which to search dependencies.
 * @param deep Whether to search for all dependencies.
 */
export type ResolveDependenciesService = (
  registry: Registry,
  upstreamRegistry: Registry,
  name: DomainName,
  version: SemanticVersion | "latest" | undefined,
  deep: boolean
) => Promise<[ValidDependency[], InvalidDependency[]]>;

/**
 * Makes a {@link ResolveDependenciesService} function.
 */
export function makeResolveDependenciesService(
  resolveRemotePackument: ResolveRemotePackumentService
): ResolveDependenciesService {
  return async (registry, upstreamRegistry, name, version, deep) => {
    // a list of pending dependency {name, version}
    const pendingList = Array.of<NameVersionPair>([name, version]);
    // a list of processed dependency {name, version}
    const processedList = Array.of<NameVersionPair>();
    // a list of dependency entry exists on the registry
    const depsValid = Array.of<ValidDependency>();
    // a list of dependency entry doesn't exist on the registry
    const depsInvalid = Array.of<InvalidDependency>();
    // cached dict
    let packumentCache = emptyPackumentCache;

    async function tryResolveFromRegistry(
      registry: Registry,
      packumentName: DomainName,
      version: ResolvableVersion
    ) {
      // First try cache
      const cacheResult = tryResolveFromCache(
        packumentCache,
        registry.url,
        packumentName,
        version
      );
      if (cacheResult.isOk()) return cacheResult;

      // Then registry
      return await resolveRemotePackument(packumentName, version, registry)
        .promise;
    }

    while (pendingList.length > 0) {
      // NOTE: Guaranteed defined because of while loop logic
      const entry = pendingList.shift()!;
      const [entryName, entryVersion] = entry;

      const isProcessed = processedList.some((processed) =>
        areArraysEqual(processed, entry)
      );
      if (!isProcessed) {
        // add entry to processed list
        processedList.push(entry);
        const isInternal = isInternalPackage(entryName);
        const isSelf = entryName === name;
        let source = upstreamRegistry.url;
        let resolvedVersion = entryVersion;

        if (!isInternal) {
          // First primary registry
          let resolveResult = await tryResolveFromRegistry(
            registry,
            entryName,
            entryVersion
          );
          // Then upstream registry
          if (resolveResult.isErr()) {
            const upstreamResult = await tryResolveFromRegistry(
              upstreamRegistry,
              entryName,
              entryVersion
            );
            if (upstreamResult.isOk()) resolveResult = upstreamResult;
            else resolveResult = pickMostFixable(resolveResult, upstreamResult);
          }

          if (resolveResult.isErr()) {
            depsInvalid.push({
              name: entryName,
              self: isSelf,
              reason: resolveResult.error,
            });
            continue;
          }

          // Packument was resolved successfully
          source = resolveResult.value.source;
          const resolvedPackumentVersion = resolveResult.value.packumentVersion;
          resolvedVersion = resolvedPackumentVersion.version;
          packumentCache = addToCache(
            packumentCache,
            resolveResult.value.source,
            resolveResult.value.packument
          );

          // add dependencies to pending list
          if (isSelf || deep) {
            const dependencies = dependenciesOf(resolvedPackumentVersion);
            pendingList.push(...dependencies);
          }
        }

        // We can safely assert this. entryVersion can only not be a semantic
        // version for the initial input, but then it should not be internal
        // and thus resolve to a semantic version.
        assert(resolvedVersion !== undefined);
        assert(isSemanticVersion(resolvedVersion));

        const dependency: ValidDependency = {
          name: entryName,
          version: resolvedVersion,
          internal: isInternal,
          source,
          self: isSelf,
        };
        depsValid.push(dependency);
      }
    }
    return [depsValid, depsInvalid];
  };
}
