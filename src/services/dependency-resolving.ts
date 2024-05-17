import { DomainName, isInternalPackage } from "../domain/domain-name";
import { SemanticVersion } from "../domain/semantic-version";
import { addToCache, emptyPackumentCache } from "../packument-cache";
import {
  PackumentResolveError,
  pickMostFixable,
  ResolvableVersion,
  ResolvedPackument,
  tryResolveFromCache,
} from "../packument-resolving";
import { RegistryUrl } from "../domain/registry-url";
import { Registry } from "../domain/registry";
import { ResolveRemotePackumentService } from "./resolve-remote-packument";
import { areArraysEqual } from "../utils/array-utils";
import { dependenciesOf } from "../domain/package-manifest";
import {
  ResolveLatestVersionError,
  ResolveLatestVersionService,
} from "./resolve-latest-version";
import { Err, Ok, Result } from "ts-results-es";
import { PackumentNotFoundError } from "../common-errors";
import { HttpErrorBase } from "npm-registry-fetch/lib/errors";
import { FetchPackumentError } from "../io/packument-io";

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
   * The source from which this dependency was resolved. Either the url of the
   * source registry or "built-in" if the dependency was a built-in package.
   */
  readonly source: RegistryUrl | "built-in";
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

type NameVersionPair = Readonly<[DomainName, SemanticVersion]>;

/**
 * Error which may occur when resolving the dependencies for a package.
 */
export type DependencyResolveError =
  | ResolveLatestVersionError
  | FetchPackumentError;

/**
 * Service function for resolving all dependencies for a package.
 * @param sources Sources from which dependencies can be resolved.
 * @param name The name of the package.
 * @param version The version for which to search dependencies.
 * @param deep Whether to search for all dependencies.
 */
export type ResolveDependenciesService = (
  sources: ReadonlyArray<Registry>,
  name: DomainName,
  version: SemanticVersion | "latest" | undefined,
  deep: boolean
) => Promise<
  Result<[ValidDependency[], InvalidDependency[]], DependencyResolveError>
>;

/**
 * Makes a {@link ResolveDependenciesService} function.
 */
export function makeResolveDependenciesService(
  resolveRemotePackument: ResolveRemotePackumentService,
  resolveLatestVersion: ResolveLatestVersionService
): ResolveDependenciesService {
  // TODO: Add tests for this service

  return async (sources, name, version, deep) => {
    const latestVersionResult =
      version === undefined || version === "latest"
        ? await resolveLatestVersion(sources, name).promise
        : Ok(version);
    if (latestVersionResult.isErr()) return latestVersionResult;

    const latestVersion = latestVersionResult.value;

    // a list of pending dependency {name, version}
    const pendingList = Array.of<NameVersionPair>([name, latestVersion]);
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

        if (isInternal) {
          depsValid.push({
            name: entryName,
            version: latestVersion,
            source: "built-in",
            self: isSelf,
          });
          continue;
        }

        // Search all given registries.
        let resolveResult: Result<
          ResolvedPackument,
          PackumentResolveError | HttpErrorBase
        > = Err(new PackumentNotFoundError());
        for (const source of sources) {
          const result = await tryResolveFromRegistry(
            source,
            entryName,
            entryVersion
          );
          if (result.isErr()) {
            resolveResult = pickMostFixable(resolveResult, result);
            continue;
          }

          resolveResult = result;
          break;
        }

        if (resolveResult.isErr()) {
          if (resolveResult.error instanceof HttpErrorBase)
            return resolveResult;

          depsInvalid.push({
            name: entryName,
            self: isSelf,
            reason: resolveResult.error,
          });
          continue;
        }

        // Packument was resolved successfully
        const source = resolveResult.value.source;
        const resolvedPackumentVersion = resolveResult.value.packumentVersion;
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

        const dependency: ValidDependency = {
          name: entryName,
          version: entryVersion,
          source,
          self: isSelf,
        };
        depsValid.push(dependency);
      }
    }
    return Ok([depsValid, depsInvalid]);
  };
}
