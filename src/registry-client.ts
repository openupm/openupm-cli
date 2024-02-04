import { promisify } from "util";
import RegClient, {
  AddUserParams,
  AddUserResponse,
  ClientCallback,
  GetParams,
  NpmAuth,
} from "another-npm-registry-client";
import log from "./logger";
import request from "request";
import assert, { AssertionError } from "assert";
import { tryGetLatestVersion, UnityPackument } from "./types/packument";
import { DomainName, isInternalPackage } from "./types/domain-name";
import { SemanticVersion } from "./types/semantic-version";
import { packageReference } from "./types/package-reference";
import { RegistryUrl } from "./types/registry-url";
import { recordEntries, recordKeys } from "./utils/record-utils";
import {
  addToCache,
  emptyPackumentCache,
  tryGetFromCache,
} from "./packument-cache";

export type NpmClient = {
  /**
   * @throws {NpmClientError}
   */
  get(uri: string, options: GetParams): Promise<UnityPackument>;
  /**
   * @throws {NpmClientError}
   */
  adduser(uri: string, options: AddUserParams): Promise<AddUserResponse>;
};

export class NpmClientError extends Error {
  cause: Error;
  response: request.Response;

  constructor(cause: Error, response: request.Response) {
    super(
      cause?.message ??
        "An error occurred while interacting with an Npm registry"
    );
    this.name = "NpmClientError";
    this.cause = cause;
    this.response = response;
  }
}

export type DependencyBase = {
  readonly name: DomainName;
  readonly self: boolean;
};

export interface ValidDependency extends DependencyBase {
  readonly upstream: boolean;
  readonly internal: boolean;
  readonly version: SemanticVersion | "latest" | undefined;
}

interface PackageNotFoundDependency extends DependencyBase {
  readonly version: SemanticVersion | "latest" | undefined;
  readonly reason: "package404";
}
interface VersionNotFoundDependency extends DependencyBase {
  readonly version: SemanticVersion;
  readonly reason: "version404";
}

export type InvalidDependency =
  | PackageNotFoundDependency
  | VersionNotFoundDependency;

export type Registry = {
  url: RegistryUrl;
  auth: NpmAuth | null;
};

type NameVersionPair = {
  name: DomainName;
  version: SemanticVersion | "latest" | undefined;
};

/**
 * @throws {AssertionError} The given parameter is not a {@link NpmClientError}.
 */
export function assertIsNpmClientError(
  x: unknown
): asserts x is NpmClientError {
  if (!(x instanceof NpmClientError))
    throw new AssertionError({
      message: "Given object was not an NpmClientError",
      actual: x,
    });
}

/**
 * Normalizes a RegClient function. Specifically it merges it's multiple
 * callback arguments into a single NormalizedError object. This function
 * also takes care of binding and promisifying.
 */
function normalizeClientFunction<TParam, TData>(
  client: RegClient.Instance,
  fn: (uri: string, params: TParam, cb: ClientCallback<TData>) => void
): (uri: string, params: TParam) => Promise<TData> {
  const bound = fn.bind(client);
  const withNormalizedError = (
    uri: string,
    params: TParam,
    cb: (error: NpmClientError | null, data: TData) => void
  ) => {
    return bound(uri, params, (error, data, raw, res) => {
      cb(error !== null ? new NpmClientError(error, res) : null, data);
    });
  };
  return promisify(withNormalizedError);
}

/**
 * Return npm client.
 */
export const getNpmClient = (): NpmClient => {
  // create client
  const client = new RegClient({ log });
  return {
    // Promisified methods
    get: normalizeClientFunction(client, client.get),
    adduser: normalizeClientFunction(client, client.adduser),
  };
};

/**
 * Fetch package info json from registry.
 * @param registry The registry from which to get the packument.
 * @param name The name of the packument.
 * @param client The client to use for fetching.
 */
export const fetchPackument = async function (
  registry: Registry,
  name: DomainName,
  client: NpmClient
): Promise<UnityPackument | undefined> {
  const pkgPath = `${registry.url}/${name}`;
  try {
    return await client.get(pkgPath, { auth: registry.auth || undefined });
  } catch (err) {
    /* empty */
  }
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

      if (!isInternal) {
        // try fetching package info from cache
        const cachedPackument = tryGetFromCache(packumentCache, entry.name);
        let packument = cachedPackument?.packument ?? null;
        if (packument !== null) {
          isUpstream = cachedPackument!.upstream;
        }
        // try fetching package info from the default registry
        if (packument === null) {
          packument =
            (await fetchPackument(registry, entry.name, client)) ?? null;
          if (packument) {
            isUpstream = false;
            packumentCache = addToCache(packumentCache, packument, false);
          }
        }
        // try fetching package info from the upstream registry
        if (!packument) {
          packument =
            (await fetchPackument(upstreamRegistry, entry.name, client)) ??
            null;
          if (packument) {
            isUpstream = true;
            packumentCache = addToCache(packumentCache, packument, true);
          }
        }
        // handle package not exist
        if (!packument) {
          log.warn("404", `package not found: ${entry.name}`);
          depsInvalid.push({
            name: entry.name,
            version: entry.version,
            self: isSelf,
            reason: "package404",
          });
          continue;
        }
        // verify version
        const versions = recordKeys(packument.versions);
        if (!entry.version || entry.version === "latest") {
          const latestVersion = tryGetLatestVersion(packument);
          assert(latestVersion !== undefined);
          entry.version = latestVersion;
        }
        // handle version not exist
        if (!versions.find((x) => x === entry.version)) {
          log.warn(
            "404",
            `package ${packageReference(
              name,
              version
            )} is not a valid choice of ${versions.reverse().join(", ")}`
          );
          depsInvalid.push({
            name: entry.name,
            version: entry.version,
            self: isSelf,
            reason: "version404",
          });
          continue;
        }
        // add dependencies to pending list
        if (isSelf || deep) {
          const deps = recordEntries(
            packument.versions[entry.version]!["dependencies"] || {}
          ).map((x): NameVersionPair => {
            return {
              name: x[0],
              version: x[1],
            };
          });
          deps.forEach((x) => pendingList.push(x));
        }
      }
      depsValid.push({
        name: entry.name,
        version: entry.version,
        internal: isInternal,
        upstream: isUpstream,
        self: isSelf,
      });
      log.verbose(
        "dependency",
        `${packageReference(entry.name, entry.version)} ${
          isInternal ? "[internal] " : ""
        }${isUpstream ? "[upstream]" : ""}`
      );
    }
  }
  return [depsValid, depsInvalid];
};
