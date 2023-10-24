import fs from "fs";
import path from "path";
import url from "url";
import _ from "lodash";
import chalk from "chalk";
import mkdirp from "mkdirp";
import net from "node:net";
import isWsl from "is-wsl";
import TOML from "@iarna/toml";
import yaml from "yaml";
import execute from "./utils/process";
import { getNpmClient } from "./client";
import log from "./logger";
import { assertIsError } from "./utils/error-type-guards";
import search from "libnpmsearch";
import assert from "assert";

export const env: Env = {
  auth: {},
  color: false,
  cwd: "",
  editorVersion: null,
  manifestPath: "",
  namespace: "",
  region: "us",
  registry: "",
  systemUser: false,
  upstream: false,
  upstreamRegistry: "",
  wsl: false,
};

// Parse env
export const parseEnv = async function (
  options: { _global: GlobalOptions } & Record<string, unknown>,
  { checkPath }: { checkPath: unknown }
) {
  // set defaults
  env.registry = "https://package.openupm.com";
  env.namespace = "com.openupm";
  env.cwd = "";
  env.manifestPath = "";
  env.upstream = true;
  env.color = true;
  env.upstreamRegistry = "https://packages.unity.com";
  env.systemUser = false;
  env.wsl = false;
  env.editorVersion = null;
  env.region = "us";
  // the npmAuth field of .upmconfig.toml
  env.npmAuth = {};
  // the dict of auth param for npm registry API
  env.auth = {};
  // log level
  log.level = options._global.verbose ? "verbose" : "notice";
  // color
  if (!options._global.color) env.color = false;
  if (process.env.NODE_ENV == "test") env.color = false;
  if (!env.color) {
    chalk.level = 0;
    log.disableColor();
  }
  // upstream
  if (!options._global.upstream) env.upstream = false;
  // region cn
  if (options._global.cn) {
    env.registry = "https://package.openupm.cn";
    env.upstreamRegistry = "https://packages.unity.cn";
    env.region = "cn";
    log.notice("region", "cn");
  }
  // registry
  if (options._global.registry) {
    let registry = options._global.registry;
    if (!registry.toLowerCase().startsWith("http"))
      registry = "http://" + registry;
    if (registry.endsWith("/")) registry = registry.slice(0, -1);
    env.registry = registry;
    // TODO: Check hostname for null
    const hostname = url.parse(registry).hostname as string;
    if (net.isIP(hostname)) env.namespace = hostname;
    else env.namespace = hostname.split(".").reverse().slice(0, 2).join(".");
  }
  // auth
  if (options._global.systemUser) env.systemUser = true;
  if (options._global.wsl) env.wsl = true;
  const upmConfig = await loadUpmConfig();
  if (upmConfig) {
    env.npmAuth = upmConfig.npmAuth;
    if (env.npmAuth) {
      for (const reg in env.npmAuth) {
        const regAuth = env.npmAuth[reg];
        if ("token" in regAuth) {
          env.auth[reg] = {
            token: regAuth.token,
            alwaysAuth: regAuth.alwaysAuth || false,
          };
        } else if ("_auth" in regAuth) {
          const buf = Buffer.from(regAuth._auth, "base64");
          const text = buf.toString("utf-8");
          const [username, password] = text.split(":", 2);
          env.auth[reg] = {
            username,
            password: Buffer.from(password).toString("base64"),
            email: regAuth.email,
            alwaysAuth: regAuth.alwaysAuth || false,
          };
        } else {
          log.warn(
            "env.auth",
            `failed to parse auth info for ${reg} in .upmconfig.toml: missing token or _auth fields`
          );
          log.warn("env.auth", regAuth);
        }
      }
    }
  }
  // log.verbose("env.npmAuth", env.npmAuth);
  // log.verbose("env.auth", env.auth);
  // return if no need to check path
  if (!checkPath) return true;
  // cwd
  if (options._global.chdir) {
    const cwd = path.resolve(options._global.chdir);
    if (!fs.existsSync(cwd)) {
      log.error("env", `can not resolve path ${cwd}`);
      return false;
    }
    env.cwd = cwd;
  } else env.cwd = process.cwd();
  // manifest path
  const manifestPath = path.join(env.cwd, "Packages/manifest.json");
  if (!fs.existsSync(manifestPath)) {
    log.error(
      "manifest",
      `can not locate manifest.json at path ${manifestPath}`
    );
    return false;
  } else env.manifestPath = manifestPath;
  // editor version
  const projectVersionPath = path.join(
    env.cwd,
    "ProjectSettings/ProjectVersion.txt"
  );
  if (!fs.existsSync(projectVersionPath)) {
    log.warn(
      "ProjectVersion",
      `can not locate ProjectVersion.text at path ${projectVersionPath}`
    );
  } else {
    const projectVersionData = fs.readFileSync(projectVersionPath, "utf8");
    const projectVersionContent = yaml.parse(projectVersionData);
    env.editorVersion = projectVersionContent.m_EditorVersion;
  }
  // return
  return true;
};

// Parse name to {name, version}
export const parseName = function (pkg: Pkg): {
  name: PkgName;
  version: PkgVersionName | undefined;
} {
  const segs = pkg.split("@");
  const name = segs[0];
  const version =
    segs.length > 1 ? segs.slice(1, segs.length).join("@") : undefined;
  return { name, version };
};

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
  version: PkgVersionName | undefined;
  deep: boolean;
}): Promise<[Dependency[], Dependency[]]> {
  log.verbose("dependency", `fetch: ${name}@${version} deep=${deep}`);
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
    PkgVersionName,
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
          const latestVersion = getLatestVersion(pkgInfo);
          assert(latestVersion !== undefined);
          // eslint-disable-next-line require-atomic-updates
          depObj.version = entry.version = latestVersion;
        }
        // handle version not exist
        if (!versions.find((x) => x == entry.version)) {
          log.warn(
            "404",
            `package ${entry.name}@${
              entry.version
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
          ).map((x: [PkgName, PkgVersionName]): NameVersionPair => {
            return { name: x[0], version: x[1] };
          });
          deps.forEach((x) => pendingList.push(x));
        }
      }
      depsValid.push(depObj);
      log.verbose(
        "dependency",
        `${entry.name}@${entry.version} ${
          depObj.internal ? "[internal] " : ""
        }${depObj.upstream ? "[upstream]" : ""}`
      );
    }
  }
  return [depsValid, depsInvalid];
};

// Get latest version from package info
export const getLatestVersion = function (
  pkgInfo: PkgInfo
): PkgVersionName | undefined {
  if (pkgInfo["dist-tags"]?.["latest"] !== undefined)
    return pkgInfo["dist-tags"]["latest"];
  else if (pkgInfo.version) return pkgInfo.version;
};

// Load manifest json file
export const loadManifest = function (): PkgManifest | null {
  try {
    const text = fs.readFileSync(env.manifestPath, { encoding: "utf8" });
    return JSON.parse(text);
  } catch (err) {
    assertIsError(err);
    if (err.code == "ENOENT")
      log.error("manifest", "file Packages/manifest.json does not exist");
    else {
      log.error(
        "manifest",
        `failed to parse Packages/manifest.json at ${env.manifestPath}`
      );
      log.error("manifest", err.message);
    }
    return null;
  }
};

// Save manifest json file
export const saveManifest = function (data: PkgManifest) {
  const json = JSON.stringify(data, null, 2);
  try {
    fs.writeFileSync(env.manifestPath, json);
    return true;
  } catch (err) {
    assertIsError(err);
    log.error("manifest", "can not write manifest json file");
    log.error("manifest", err.message);
    return false;
  }
};

// Get .upmconfig.toml directory
export const getUpmConfigDir = async function (): Promise<string> {
  let dirPath: string | undefined = "";
  const systemUserSubPath = "Unity/config/ServiceAccounts";
  if (env.wsl) {
    if (!isWsl) {
      throw new Error("no WSL detected");
    }
    if (env.systemUser) {
      const allUserProfilePath = await execute(
        'wslpath "$(wslvar ALLUSERSPROFILE)"',
        { trim: true }
      );
      dirPath = path.join(allUserProfilePath, systemUserSubPath);
    } else {
      dirPath = await execute('wslpath "$(wslvar USERPROFILE)"', {
        trim: true,
      });
    }
  } else {
    dirPath = process.env.USERPROFILE
      ? process.env.USERPROFILE
      : process.env.HOME;
    if (env.systemUser) {
      if (!process.env.ALLUSERSPROFILE) {
        throw new Error("env ALLUSERSPROFILE is empty");
      }
      dirPath = path.join(process.env.ALLUSERSPROFILE, systemUserSubPath);
    }
  }
  if (dirPath === undefined)
    throw new Error("Could not resolve upm-config dir-path");
  return dirPath;
};

// Load .upmconfig.toml
export const loadUpmConfig = async function (
  configDir?: string
): Promise<UPMConfig | undefined> {
  if (configDir === undefined) configDir = await getUpmConfigDir();
  const configPath = path.join(configDir, ".upmconfig.toml");
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, "utf8");
    const config = TOML.parse(content);

    // NOTE: We assume correct format
    return config as UPMConfig;
  }
};

// Save .upmconfig.toml
export const saveUpmConfig = async function (
  config: UPMConfig,
  configDir: string
) {
  if (configDir === undefined) configDir = await getUpmConfigDir();
  mkdirp.sync(configDir);
  const configPath = path.join(configDir, ".upmconfig.toml");
  const content = TOML.stringify(config);
  fs.writeFileSync(configPath, content, "utf8");
  log.notice("config", "saved unity config at " + configPath);
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
  version: string
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

// Detect if the given package name is an internal package
export const isInternalPackage = function (name: PkgName): boolean {
  const internals = [
    "com.unity.ugui",
    "com.unity.2d.sprite",
    "com.unity.2d.tilemap",
    "com.unity.package-manager-ui",
    "com.unity.ugui",
  ];
  return /com.unity.modules/i.test(name) || internals.includes(name);
};
