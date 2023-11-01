import _ from "lodash";
import { getNpmClient } from "./client";
import log from "./logger";
import search from "libnpmsearch";
import assert from "assert";
import {
  Dependency,
  NameVersionPair,
  PkgInfo,
  PkgName,
  PkgVersion,
  Registry,
  SemanticVersion,
} from "./types/global";
import { atVersion, isInternalPackage } from "./utils/pkg-name";
import { tryGetLatestVersion } from "./utils/pkg-info";
import { env } from "./utils/env";

// Get npm fetch options
export const getNpmFetchOptions = function (): search.Options {
  const opts: search.Options = {
    log,
    registry: env.registry,
  };
  const auth = env.auth[env.registry];
  if (auth) Object.assign(opts, auth);
  return opts;
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

// Compare unity editor version and return -1, 0, or 1.
export const compareEditorVersion = function (a: string, b: string) {
  const verA = parseEditorVersion(a);
  const verB = parseEditorVersion(b);

  if (verA === null || verB === null)
    throw new Error("An editor version could not be parsed");

  const editorVersionToArray = (ver: SemanticVersion) => [
    ver.major,
    ver.minor,
    ver.patch || 0,
    ver.flagValue || 0,
    ver.build || 0,
    ver.locValue || 0,
    ver.locBuild || 0,
  ];
  const arrA = editorVersionToArray(verA);
  const arrB = editorVersionToArray(verB);
  for (let i = 0; i < arrA.length; i++) {
    const valA = arrA[i];
    const valB = arrB[i];
    if (valA > valB) return 1;
    else if (valA < valB) return -1;
  }
  return 0;
};

/**
 * Prase editor version string to groups.
 *
 * E.g. 2020.2.0f2c4
 *   major: 2020
 *   minor: 2
 *   patch: 0
 *   flag: 'f'
 *   flagValue: 2
 *   build: 2
 *   loc: 'c'
 *   locValue: 1
 *   locBuild: 4
 */
export const parseEditorVersion = function (
  version: string | null
): SemanticVersion | null {
  type RegexMatchGroups = {
    major: `${number}`;
    minor: `${number}`;
    patch?: string;
    flag?: "a" | "b" | "f" | "c";
    build?: `${number}`;
    loc?: "c";
    locBuild?: `${number}`;
  };

  if (!version) return null;
  const regex =
    /^(?<major>\d+)\.(?<minor>\d+)(\.(?<patch>\d+)((?<flag>a|b|f|c)(?<build>\d+)((?<loc>c)(?<locBuild>\d+))?)?)?/;
  const match = regex.exec(version);
  if (!match) return null;
  const groups = <RegexMatchGroups>match.groups;
  const result: SemanticVersion = {
    major: parseInt(groups.major),
    minor: parseInt(groups.minor),
  };
  if (groups.patch) result.patch = parseInt(groups.patch);
  if (groups.flag) {
    result.flag = groups.flag;
    if (result.flag == "a") result.flagValue = 0;
    if (result.flag == "b") result.flagValue = 1;
    if (result.flag == "f") result.flagValue = 2;
    if (groups.build) result.build = parseInt(groups.build);
  }

  if (groups.loc) {
    result.loc = groups.loc.toLowerCase();
    if (result.loc == "c") result.locValue = 1;
    if (groups.locBuild) result.locBuild = parseInt(groups.locBuild);
  }
  return result;
};
