import { promisify } from "util";
import RegClient, {
  AddUserParams,
  AddUserResponse,
  ClientCallback,
  GetParams,
} from "another-npm-registry-client";
import log from "./logger";
import request from "request";
import assert, { AssertionError } from "assert";
import {
  Dependency,
  NameVersionPair,
  PkgInfo,
  PkgName,
  PkgVersion,
  Registry,
} from "./types/global";
import { env } from "./utils/env";
import { atVersion, isInternalPackage } from "./utils/pkg-name";
import _ from "lodash";
import { tryGetLatestVersion } from "./utils/pkg-info";

export type NpmClient = {
  rawClient: RegClient;
  /**
   * @throws {NpmClientError}
   */
  get(uri: string, options: GetParams): Promise<PkgInfo>;
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
  client: RegClient,
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
 * Return npm client
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
// Fetch package info json from registry
export const fetchPackageInfo = async function (
  name: PkgName,
  registry?: Registry
): Promise<PkgInfo | undefined> {
  if (!registry) registry = env.registry;
  const pkgPath = `${registry}/${name}`;
  const client = getNpmClient();
  try {
    return await client.get(pkgPath, { auth: env.auth[registry] || undefined });
    // eslint-disable-next-line no-empty
  } catch (err) {}
};
/* Fetch package [valid dependencies, invalid dependencies] with a structure of
  [
    {
      name,
      version,
      upstream,   // whether belongs to upstream registry
      self,       // whether is the source package
      internal,     // whether is an internal package
      reason      // invalid reason of "version404", "package404"
    }, ...
  ]
 */
export const fetchPackageDependencies = async function ({
  name,
  version,
  deep,
}: {
  name: PkgName;
  version: PkgVersion | undefined;
  deep?: boolean;
}): Promise<[Dependency[], Dependency[]]> {
  log.verbose(
    "dependency",
    `fetch: ${
      version !== undefined ? atVersion(name, version) : name
    } deep=${deep}`
  );
  // a list of pending dependency {name, version}
  const pendingList: NameVersionPair[] = [{ name, version }];
  // a list of processed dependency {name, version}
  const processedList = [];
  // a list of dependency entry exists on the registry
  const depsValid = [];
  // a list of dependency entry doesn't exist on the registry
  const depsInvalid = [];
  // cached dict: {pkg-name: pkgInfo}
  const cachedPacakgeInfoDict: Record<
    PkgVersion,
    { pkgInfo: PkgInfo; upstream: boolean }
  > = {};
  while (pendingList.length > 0) {
    // NOTE: Guaranteed defined because of while loop logic
    const entry = pendingList.shift() as NameVersionPair;
    if (processedList.find((x) => _.isEqual(x, entry)) === undefined) {
      // add entry to processed list
      processedList.push(entry);
      // create valid depedenency structure
      const depObj: Dependency = {
        ...entry,
        internal: isInternalPackage(entry.name),
        upstream: false,
        self: entry.name == name,
        version: "",
        reason: null,
      };
      if (!depObj.internal) {
        // try fetching package info from cache
        const getResult = _.get(cachedPacakgeInfoDict, entry.name, {
          pkgInfo: null,
          upstream: false,
        });
        let pkgInfo = getResult.pkgInfo;
        const upstream = getResult.upstream;
        if (pkgInfo !== null) {
          depObj.upstream = upstream;
        }
        // try fetching package info from the default registry
        if (pkgInfo === null) {
          pkgInfo = (await fetchPackageInfo(entry.name)) ?? null;
          if (pkgInfo) {
            depObj.upstream = false;
            cachedPacakgeInfoDict[entry.name] = { pkgInfo, upstream: false };
          }
        }
        // try fetching package info from the upstream registry
        if (!pkgInfo) {
          pkgInfo =
            (await fetchPackageInfo(entry.name, env.upstreamRegistry)) ?? null;
          if (pkgInfo) {
            depObj.upstream = true;
            cachedPacakgeInfoDict[entry.name] = { pkgInfo, upstream: true };
          }
        }
        // handle package not exist
        if (!pkgInfo) {
          log.warn("404", `package not found: ${entry.name}`);
          depObj.reason = "package404";
          depsInvalid.push(depObj);
          continue;
        }
        // verify version
        const versions = Object.keys(pkgInfo.versions);
        if (!entry.version || entry.version == "latest") {
          const latestVersion = tryGetLatestVersion(pkgInfo);
          assert(latestVersion !== undefined);
          // eslint-disable-next-line require-atomic-updates
          depObj.version = entry.version = latestVersion;
        }
        // handle version not exist
        if (!versions.find((x) => x == entry.version)) {
          log.warn(
            "404",
            `package ${
              version !== undefined ? atVersion(name, version) : name
            } is not a valid choice of ${versions.reverse().join(", ")}`
          );
          depObj.reason = "version404";
          // eslint-disable-next-line require-atomic-updates
          // depObj.version = entry.version = getLatestVersion(pkgInfo);
          // log.warn("notarget", `fallback to ${entry.name}@${entry.version}`);
          depsInvalid.push(depObj);
          continue;
        }
        // add dependencies to pending list
        if (depObj.self || deep) {
          const deps: NameVersionPair[] = _.toPairs(
            pkgInfo.versions[entry.version]["dependencies"]
          ).map((x: [PkgName, PkgVersion]): NameVersionPair => {
            return { name: x[0], version: x[1] };
          });
          deps.forEach((x) => pendingList.push(x));
        }
      }
      depsValid.push(depObj);
      log.verbose(
        "dependency",
        `${
          entry.version !== undefined
            ? atVersion(entry.name, entry.version)
            : entry.name
        } ${depObj.internal ? "[internal] " : ""}${
          depObj.upstream ? "[upstream]" : ""
        }`
      );
    }
  }
  return [depsValid, depsInvalid];
};
