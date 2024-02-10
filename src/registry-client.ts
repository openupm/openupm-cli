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
import { UnityPackument } from "./types/packument";
import { DomainName, isInternalPackage } from "./types/domain-name";
import { isSemanticVersion, SemanticVersion } from "./types/semantic-version";
import { packageReference } from "./types/package-reference";
import { RegistryUrl } from "./types/registry-url";
import { recordEntries } from "./utils/record-utils";
import { addToCache, emptyPackumentCache } from "./packument-cache";
import {
  pickMostFixable,
  ResolvableVersion,
  ResolveFailure,
  tryResolve,
  tryResolveFromCache,
} from "./packument-query";
import { unityRegistryUrl } from "../test/mock-registry";

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
