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

export type NpmClient = {
  rawClient: RegClient.Instance;
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

export type Dependency = {
  name: DomainName;
  version?: SemanticVersion;
  upstream: boolean;
  self: boolean;
  internal: boolean;
  reason: "package404" | "version404" | null;
  resolved?: boolean;
};

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
    // The instance of raw npm client
    rawClient: client,
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
): Promise<[Dependency[], Dependency[]]> {
  log.verbose(
    "dependency",
    `fetch: ${packageReference(name, version)} deep=${deep}`
  );
  // a list of pending dependency {name, version}
  const pendingList: NameVersionPair[] = [{ name, version }];
  // a list of processed dependency {name, version}
  const processedList = Array.of<NameVersionPair>();
  // a list of dependency entry exists on the registry
  const depsValid = [];
  // a list of dependency entry doesn't exist on the registry
  const depsInvalid = [];
  // cached dict
  const cachedPackageInfoDict: Record<
    DomainName,
    { packument: UnityPackument; upstream: boolean }
  > = {};
  while (pendingList.length > 0) {
    // NOTE: Guaranteed defined because of while loop logic
    const entry = pendingList.shift() as NameVersionPair;
    const isProcessed = processedList.some(
      (x) => x.name === entry.name && x.version === entry.version
    );
    if (!isProcessed) {
      // add entry to processed list
      processedList.push(entry);
      // create valid dependency structure
      const depObj: Dependency = {
        name: entry.name,
        /* 
        NOTE: entry.version could also be "latest" or undefined. 
        Later code guarantees that in that case depObj.version will be replaced
        with a valid-semantic version. So we can assert the value here safely
         */
        version: entry.version as SemanticVersion,
        internal: isInternalPackage(entry.name),
        upstream: false,
        self: entry.name == name,
        reason: null,
      };
      if (!depObj.internal) {
        // try fetching package info from cache
        const getResult = cachedPackageInfoDict[entry.name] ?? {
          packument: null,
          upstream: false,
        };
        let packument = getResult.packument;
        const upstream = getResult.upstream;
        if (packument !== null) {
          depObj.upstream = upstream;
        }
        // try fetching package info from the default registry
        if (packument === null) {
          packument =
            (await fetchPackument(registry, entry.name, client)) ?? null;
          if (packument) {
            depObj.upstream = false;
            cachedPackageInfoDict[entry.name] = {
              packument: packument,
              upstream: false,
            };
          }
        }
        // try fetching package info from the upstream registry
        if (!packument) {
          packument =
            (await fetchPackument(upstreamRegistry, entry.name, client)) ??
            null;
          if (packument) {
            depObj.upstream = true;
            cachedPackageInfoDict[entry.name] = {
              packument: packument,
              upstream: true,
            };
          }
        }
        // handle package not exist
        if (!packument) {
          log.warn("404", `package not found: ${entry.name}`);
          depObj.reason = "package404";
          depsInvalid.push(depObj);
          continue;
        }
        // verify version
        const versions = Object.keys(packument.versions);
        if (!entry.version || entry.version == "latest") {
          const latestVersion = tryGetLatestVersion(packument);
          assert(latestVersion !== undefined);
          depObj.version = entry.version = latestVersion;
        }
        // handle version not exist
        if (!versions.find((x) => x == entry.version)) {
          log.warn(
            "404",
            `package ${packageReference(
              name,
              version
            )} is not a valid choice of ${versions.reverse().join(", ")}`
          );
          depObj.reason = "version404";
          depsInvalid.push(depObj);
          continue;
        }
        // add dependencies to pending list
        if (depObj.self || deep) {
          const deps: NameVersionPair[] = (
            Object.entries(
              packument.versions[entry.version]!["dependencies"] || {}
            ) as [DomainName, SemanticVersion][]
          ).map((x): NameVersionPair => {
            return {
              name: x[0],
              version: x[1],
            };
          });
          deps.forEach((x) => pendingList.push(x));
        }
      }
      depsValid.push(depObj);
      log.verbose(
        "dependency",
        `${packageReference(entry.name, entry.version)} ${
          depObj.internal ? "[internal] " : ""
        }${depObj.upstream ? "[upstream]" : ""}`
      );
    }
  }
  return [depsValid, depsInvalid];
};
