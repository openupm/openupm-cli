import { DomainName, isInternalPackage } from "./types/domain-name";
import { isSemanticVersion, SemanticVersion } from "./types/semantic-version";
import log from "./logger";
import { packageReference } from "./types/package-reference";
import { addToCache, emptyPackumentCache } from "./packument-cache";
import {
  PackumentResolveError,
  pickMostFixable,
  ResolvableVersion,
  tryResolve,
  tryResolveFromCache,
  VersionNotFoundError,
} from "./packument-resolving";
import { unityRegistryUrl } from "./types/registry-url";
import { recordEntries } from "./utils/record-utils";
import assert from "assert";
import { NpmClient, Registry } from "./npm-client";
import { PackumentNotFoundError } from "./common-errors";

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
   * Whether this dependency was found on the upstream registry.
   */
  readonly upstream: boolean;
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

type NameVersionPair = Readonly<{
  name: DomainName;
  version: SemanticVersion | "latest" | undefined;
}>;
/**
 * Fetch package dependencies.
 * @param registry The registry in which to search the dependencies.
 * @param upstreamRegistry The upstream registry in which to search as a backup.
 * @param name The name of the package.
 * @param version The version for which to search dependencies.
 * @param deep Whether to search for all dependencies.
 * @param client The client to use for communicating with the registries.
 */
export const fetchPackageDependencies = async function (
  registry: Registry,
  upstreamRegistry: Registry,
  name: DomainName,
  version: SemanticVersion | "latest" | undefined,
  deep: boolean,
  client: NpmClient
): Promise<[ValidDependency[], InvalidDependency[]]> {
  log.verbose(
    "dependency",
    `fetch: ${packageReference(name, version)} deep=${deep}`
  );
  // a list of pending dependency {name, version}
  const pendingList: NameVersionPair[] = [{ name, version }];
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
    return await tryResolve(client, packumentName, version, registry);
  }

  while (pendingList.length > 0) {
    // NOTE: Guaranteed defined because of while loop logic
    const entry = pendingList.shift() as NameVersionPair;
    const isProcessed = processedList.some(
      (x) => x.name === entry.name && x.version === entry.version
    );
    if (!isProcessed) {
      // add entry to processed list
      processedList.push(entry);
      const isInternal = isInternalPackage(entry.name);
      const isSelf = entry.name === name;
      let isUpstream = false;
      let resolvedVersion = entry.version;

      if (!isInternal) {
        // First primary registry
        let resolveResult = await tryResolveFromRegistry(
          registry,
          entry.name,
          entry.version
        );
        // Then upstream registry
        if (resolveResult.isErr()) {
          const upstreamResult = await tryResolveFromRegistry(
            upstreamRegistry,
            entry.name,
            entry.version
          );
          if (upstreamResult.isOk()) resolveResult = upstreamResult;
          else resolveResult = pickMostFixable(resolveResult, upstreamResult);
        }

        // If none resolved successfully, log the most fixable failure
        if (resolveResult.isErr()) {
          if (resolveResult.error instanceof PackumentNotFoundError) {
            log.warn("404", `package not found: ${entry.name}`);
          } else if (resolveResult.error instanceof VersionNotFoundError) {
            const versionList = [...resolveResult.error.availableVersions]
              .reverse()
              .join(", ");
            log.warn(
              "404",
              `version ${resolveResult.error.requestedVersion} is not a valid choice of ${versionList}`
            );
          }
          depsInvalid.push({
            name: entry.name,
            self: isSelf,
            reason: resolveResult.error,
          });
          continue;
        }

        // Packument was resolved successfully
        isUpstream = resolveResult.value.source === unityRegistryUrl;
        resolvedVersion = resolveResult.value.packumentVersion.version;
        packumentCache = addToCache(
          packumentCache,
          resolveResult.value.source,
          resolveResult.value.packument
        );

        // add dependencies to pending list
        if (isSelf || deep) {
          const deps = recordEntries(
            resolveResult.value.packumentVersion["dependencies"] || {}
          ).map((x): NameVersionPair => {
            return {
              name: x[0],
              version: x[1],
            };
          });
          deps.forEach((x) => pendingList.push(x));
        }
      }

      // We can safely assert this. entry.version can only not be a semantic
      // version for the initial input, but then it should not be internal
      // and thus resolve to a semantic version.
      assert(resolvedVersion !== undefined);
      assert(isSemanticVersion(resolvedVersion));

      depsValid.push({
        name: entry.name,
        version: resolvedVersion,
        internal: isInternal,
        upstream: isUpstream,
        self: isSelf,
      });
      log.verbose(
        "dependency",
        `${packageReference(entry.name, resolvedVersion)} ${
          isInternal ? "[internal] " : ""
        }${isUpstream ? "[upstream]" : ""}`
      );
    }
  }
  return [depsValid, depsInvalid];
};
