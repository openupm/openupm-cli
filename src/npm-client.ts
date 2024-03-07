import RegClient, { NpmAuth } from "another-npm-registry-client";
import log from "./logger";
import { UnityPackument } from "./types/packument";
import assert from "assert";
import { DomainName, isInternalPackage } from "./types/domain-name";
import { isSemanticVersion, SemanticVersion } from "./types/semantic-version";
import { packageReference } from "./types/package-reference";
import { RegistryUrl, unityRegistryUrl } from "./types/registry-url";
import { recordEntries } from "./utils/record-utils";
import { addToCache, emptyPackumentCache } from "./packument-cache";
import {
  pickMostFixable,
  ResolvableVersion,
  ResolveFailure,
  tryResolve,
  tryResolveFromCache,
} from "./packument-resolving";
import npmSearch from "libnpmsearch";
import { is404Error, isHttpError } from "./utils/error-type-guards";
import npmFetch from "npm-registry-fetch";

/**
 * The result of adding a user.
 */
type AddUserResult =
  | {
      /**
       * Indicates success.
       */
      isSuccess: true;
      /**
       * The authentication token retrieved by adding the user.
       */
      token: string;
    }
  | {
      /**
       * Indicates failure.
       */
      isSuccess: false;
      /**
       * The http status code returned by the server.
       */
      status: number;
      /**
       * The message returned by the server.
       */
      message: string;
    };

/**
 * A type representing a searched packument. Instead of having all versions
 * this type only includes the latest version.
 */
export type SearchedPackument = Omit<UnityPackument, "versions"> & {
  versions: Record<SemanticVersion, "latest">;
};

/**
 * The result of querying the /-/all endpoint.
 */
type AllPackumentsResult = {
  _updated: number;
  [name: DomainName]: SearchedPackument;
};

/**
 * Abstraction over a regular npm client which is specialized for UPM purposes.
 */
export interface NpmClient {
  /**
   * Attempts to get a packument from a registry.
   * @param registry The registry to get the packument from.
   * @param name The name of the packument to get.
   */
  tryFetchPackument(
    registry: Registry,
    name: DomainName
  ): Promise<UnityPackument | null>;

  /**
   * Attempts to add a user to a registry.
   * @param registryUrl The url of the registry into which to login.
   * @param username The username with which to login.
   * @param email The email with which to login.
   * @param password The password with which to login.
   * @returns An authentication token or null if registration failed.
   */
  addUser(
    registryUrl: RegistryUrl,
    username: string,
    email: string,
    password: string
  ): Promise<AddUserResult>;

  /**
   * Attempts to search a npm registry.
   * @param registry The registry to search.
   * @param keyword The keyword to search.
   */
  trySearch(
    registry: Registry,
    keyword: string
  ): Promise<SearchedPackument[] | null>;

  /**
   * Attempts to query the /-/all endpoint.
   * @param registry The registry to query.
   */
  tryGetAll(registry: Registry): Promise<AllPackumentsResult | null>;
}

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
  reason: ResolveFailure;
}

export type Registry = {
  url: RegistryUrl;
  auth: NpmAuth | null;
};

type NameVersionPair = Readonly<{
  name: DomainName;
  version: SemanticVersion | "latest" | undefined;
}>;

/**
 * Get npm fetch options.
 * @param registry The registry for which to get the options.
 */
const getNpmFetchOptions = function (registry: Registry): npmSearch.Options {
  const opts: npmSearch.Options = {
    log,
    registry: registry.url,
  };
  const auth = registry.auth;
  if (auth !== null) Object.assign(opts, auth);
  return opts;
};

/**
 * Return npm client.
 */
export const getNpmClient = (): NpmClient => {
  // create client
  const registryClient = new RegClient({ log });
  return {
    tryFetchPackument(registry, name) {
      const url = `${registry.url}/${name}`;
      return new Promise((resolve) => {
        return registryClient.get(
          url,
          { auth: registry.auth || undefined },
          (error, packument) => {
            if (error !== null) resolve(null);
            else resolve(packument);
          }
        );
      });
    },

    addUser(registryUrl, username, email, password) {
      return new Promise((resolve) => {
        registryClient.adduser(
          registryUrl,
          { auth: { username, email, password } },
          (error, responseData, _, response) => {
            if (error !== null || !responseData.ok)
              resolve({
                isSuccess: false,
                status: response.statusCode,
                message: response.statusMessage,
              });
            else resolve({ isSuccess: true, token: responseData.token });
          }
        );
      });
    },

    async trySearch(
      registry: Registry,
      keyword: string
    ): Promise<SearchedPackument[] | null> {
      try {
        // NOTE: The results of the search will be Packument objects so we can change the type
        return (await npmSearch(
          keyword,
          getNpmFetchOptions(registry)
        )) as SearchedPackument[];
      } catch (err) {
        if (isHttpError(err) && !is404Error(err)) log.error("", err.message);
        return null;
      }
    },

    async tryGetAll(registry: Registry): Promise<AllPackumentsResult | null> {
      try {
        return (await npmFetch.json(
          "/-/all",
          getNpmFetchOptions(registry)
        )) as AllPackumentsResult;
      } catch (err) {
        if (isHttpError(err) && !is404Error(err)) log.error("", err.message);
        return null;
      }
    },
  };
};

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
    let resolveResult = tryResolveFromCache(
      packumentCache,
      registry.url,
      packumentName,
      version
    );
    // Then registry
    if (!resolveResult.isSuccess) {
      resolveResult = await tryResolve(
        client,
        packumentName,
        version,
        registry
      );
    }
    return resolveResult;
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
        if (!resolveResult.isSuccess) {
          const upstreamResult = await tryResolveFromRegistry(
            upstreamRegistry,
            entry.name,
            entry.version
          );
          if (upstreamResult.isSuccess) resolveResult = upstreamResult;
          else resolveResult = pickMostFixable(resolveResult, upstreamResult);
        }

        // If none resolved successfully, log the most fixable failure
        if (!resolveResult.isSuccess) {
          if (resolveResult.issue === "PackumentNotFound") {
            log.warn("404", `package not found: ${entry.name}`);
          } else if (resolveResult.issue === "VersionNotFound") {
            const versionList = [...resolveResult.availableVersions]
              .reverse()
              .join(", ");
            log.warn(
              "404",
              `version ${resolveResult.requestedVersion} is not a valid choice of ${versionList}`
            );
          }
          depsInvalid.push({
            name: entry.name,
            self: isSelf,
            reason: resolveResult,
          });
          continue;
        }

        // Packument was resolved successfully
        isUpstream = resolveResult.source === unityRegistryUrl;
        resolvedVersion = resolveResult.packumentVersion.version;
        packumentCache = addToCache(
          packumentCache,
          resolveResult.source,
          resolveResult.packument
        );

        // add dependencies to pending list
        if (isSelf || deep) {
          const deps = recordEntries(
            resolveResult.packumentVersion["dependencies"] || {}
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
