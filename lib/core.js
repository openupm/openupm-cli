const fs = require("fs");
const os = require("os");
const path = require("path");
const url = require("url");

const _ = require("lodash");
const chalk = require("chalk");
const mkdirp = require("mkdirp");
const isIp = require("is-ip");
const isWsl = require("is-wsl");
const keyFileStorage = require("key-file-storage").default;
const TOML = require("@iarna/toml");
const yaml = require("yaml");

const { execute } = require("./utils/process");
const { getNpmClient } = require("./client");
const { log } = require("./logger");

const env = {};

// Parse env
const parseEnv = async function(options, { checkPath }) {
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
  log.level = options.parent.verbose ? "verbose" : "notice";
  // color
  if (options.parent.color === false) env.color = false;
  if (process.env.NODE_ENV == "test") env.color = false;
  if (!env.color) {
    chalk.level = 0;
    log.disableColor();
  }
  // upstream
  if (options.parent.upstream === false) env.upstream = false;
  // region cn
  if (options.parent.cn === true) {
    env.registry = "https://package.openupm.cn";
    env.upstreamRegistry = "https://packages.unity.cn";
    env.region = "cn";
    log.notice("region", "cn");
  }
  // registry
  if (options.parent.registry) {
    let registry = options.parent.registry;
    if (!registry.toLowerCase().startsWith("http"))
      registry = "http://" + registry;
    if (registry.endsWith("/")) registry = registry.slice(0, -1);
    env.registry = registry;
    const hostname = url.parse(registry).hostname;
    if (isIp(hostname)) env.namespace = hostname;
    else
      env.namespace = hostname
        .split(".")
        .reverse()
        .slice(0, 2)
        .join(".");
  }
  // auth
  if (options.parent.systemUser) env.systemUser = true;
  if (options.parent.wsl) env.wsl = true;
  const upmConfig = await loadUpmConfig();
  if (upmConfig) {
    env.npmAuth = upmConfig.npmAuth;
    if (env.npmAuth) {
      for (const reg in env.npmAuth) {
        const regAuth = env.npmAuth[reg];
        if (regAuth.token) {
          env.auth[reg] = {
            token: regAuth.token,
            alwaysAuth: regAuth.alwaysAuth || false
          };
        } else if (regAuth._auth) {
          const buf = Buffer.from(regAuth._auth, "base64");
          const text = buf.toString("utf-8");
          const [username, password] = text.split(":", 2);
          env.auth[reg] = {
            username,
            password: Buffer.from(password).toString("base64"),
            email: regAuth.email,
            alwaysAuth: regAuth.alwaysAuth || false
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
  if (options.parent.chdir) {
    const cwd = path.resolve(options.parent.chdir);
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
const parseName = function(pkg) {
  const segs = pkg.split("@");
  const name = segs[0];
  const version =
    segs.length > 1 ? segs.slice(1, segs.length).join("@") : undefined;
  return { name, version };
};

// Get npm fetch options
const getNpmFetchOptions = function() {
  const opts = {
    log,
    registry: env.registry
  };
  const auth = env.auth[env.registry];
  if (auth) {
    opts.alwaysAuth = auth.alwaysAuth;
    opts.email = auth.email;
    opts.password = auth.password;
    opts.token = auth.token;
    opts.username = auth.username;
  }
  return opts;
};

// Fetch package info json from registry
const fetchPackageInfo = async function(name, registry) {
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
      module,     // whether is an unity module
      reason      // invalid reason of "version404", "package404"
    }, ...
  ]
 */
const fetchPackageDependencies = async function({ name, version, deep }) {
  log.verbose("dependency", `fetch: ${name}@${version} deep=${deep}`);
  // a list of pending dependency {name, version}
  const pendingList = [{ name, version }];
  // a list of processed dependency {name, version}
  const processedList = [];
  // a list of dependency entry exists on the registry
  const depsValid = [];
  // a list of dependency entry doesn't exist on the registry
  const depsInvalid = [];
  // cached dict: {pkg-name: pkgInfo}
  const cachedPacakgeInfoDict = {};
  while (pendingList.length > 0) {
    const entry = pendingList.shift();
    if (processedList.find(x => _.isEqual(x, entry)) === undefined) {
      // add entry to processed list
      processedList.push(entry);
      // create valid depedenency structure
      const depObj = {
        ...entry,
        module:
          /com.unity.modules/i.test(entry.name) ||
          entry.name == "com.unity.ugui",
        upstream: false,
        self: entry.name == name,
        reason: null
      };
      if (!depObj.module) {
        // try fetching package info from cache
        let { pkgInfo, upstream } = _.get(cachedPacakgeInfoDict, entry.name, {
          pkgInfo: null,
          upstream: false
        });
        if (pkgInfo) {
          depObj.upstream = upstream;
        }
        // try fetching package info from the default registry
        if (!pkgInfo) {
          pkgInfo = await fetchPackageInfo(entry.name);
          if (pkgInfo) {
            depObj.upstream = false;
            cachedPacakgeInfoDict[entry.name] = { pkgInfo, upstream: false };
          }
        }
        // try fetching package info from the upstream registry
        if (!pkgInfo) {
          pkgInfo = await fetchPackageInfo(entry.name, env.upstreamRegistry);
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
          // eslint-disable-next-line require-atomic-updates
          depObj.version = entry.version = getLatestVersion(pkgInfo);
        }
        // handle version not exist
        if (!versions.find(x => x == entry.version)) {
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
          const deps = _.toPairs(
            pkgInfo.versions[entry.version]["dependencies"]
          ).map(x => {
            return { name: x[0], version: x[1] };
          });
          deps.forEach(x => pendingList.push(x));
        }
      }
      depsValid.push(depObj);
      log.verbose(
        "dependency",
        `${entry.name}@${entry.version} ${depObj.module ? "[module] " : ""}${
          depObj.upstream ? "[upstream]" : ""
        }`
      );
    }
  }
  return [depsValid, depsInvalid];
};

// Get latest version from package info
const getLatestVersion = function(pkgInfo) {
  if (pkgInfo["dist-tags"] && pkgInfo["dist-tags"]["latest"])
    return pkgInfo["dist-tags"]["latest"];
  else if (pkgInfo.versions)
    return Object.keys(pkgInfo.versions).find(
      key => pkgInfo.versions[key] == "latest"
    );
};

// Load manifest json file
const loadManifest = function() {
  try {
    let text = fs.readFileSync(env.manifestPath, { encoding: "utf8" });
    return JSON.parse(text);
  } catch (err) {
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
const saveManifest = function(data) {
  let json = JSON.stringify(data, null, 2);
  try {
    fs.writeFileSync(env.manifestPath, json);
    return true;
  } catch (err) {
    log.error("manifest", "can not write manifest json file");
    log.error("manifest", err.message);
    return false;
  }
};

// Return cache object
const getCache = function() {
  const homeDir = os.homedir();
  const openupmDir = path.join(homeDir, ".openupm");
  try {
    fs.mkdirSync(openupmDir);
  } catch (err) {
    if (err.code != "EEXIST") throw err;
  }
  const kfs = keyFileStorage(openupmDir);
  return kfs;
};

// Clean cache
const cleanCache = function() {
  const cache = getCache();
  delete cache["*"];
};

// Get .upmconfig.toml directory
const getUpmConfigDir = async function() {
  let dirPath = "";
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
        trim: true
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
  return dirPath;
};

// Load .upmconfig.toml
const loadUpmConfig = async function(configDir) {
  if (configDir === undefined) configDir = await getUpmConfigDir();
  const configPath = path.join(configDir, ".upmconfig.toml");
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, "utf8");
    const config = TOML.parse(content);
    return config;
  }
};

// Save .upmconfig.toml
const saveUpmConfig = async function(config, configDir) {
  if (configDir === undefined) configDir = await getUpmConfigDir();
  mkdirp.sync(configDir);
  const configPath = path.join(configDir, ".upmconfig.toml");
  const content = TOML.stringify(config);
  fs.writeFileSync(configPath, content, "utf8");
  log.notice("config", "saved unity config at " + configPath);
};

// Compare unity editor version and return -1, 0, or 1.
const compareEditorVersion = function(a, b) {
  const verA = parseEditorVersion(a);
  const verB = parseEditorVersion(b);
  let arrA = [verA.major, verA.minor];
  let arrB = [verB.major, verB.minor];
  if (verA.patch && verB.patch) {
    arrA = [verA.major, verA.minor, verA.patch, verA.flagValue, verA.build];
    arrB = [verB.major, verB.minor, verB.patch, verB.flagValue, verB.build];
  }
  for (let i = 0; i < arrA.length; i++) {
    const valA = arrA[i];
    const valB = arrB[i];
    if (valA > valB) return 1;
    else if (valA < valB) return -1;
  }
  return 0;
};

// Prase editor version string to groups.
const parseEditorVersion = function(version) {
  if (!version) return null;
  const regex = /^(?<major>\d+)\.(?<minor>\d+)(\.(?<patch>\d+)((?<flag>a|b|f|c)(?<build>\d+))?)?/;
  const match = regex.exec(version);
  if (!match) return null;
  const groups = match.groups;
  const result = {
    major: parseInt(groups.major),
    minor: parseInt(groups.minor)
  };
  if (groups.patch) result.patch = parseInt(groups.patch);
  if (groups.flag) {
    result.flag = groups.flag.toLowerCase();
    if (result.flag == "a") result.flagValue = 0;
    if (result.flag == "b") result.flagValue = 1;
    if (result.flag == "f") result.flagValue = 2;
    if (result.flag == "c") result.flagValue = 3;
  }
  if (groups.build) result.build = parseInt(groups.build);
  return result;
};

module.exports = {
  cleanCache,
  compareEditorVersion,
  env,
  fetchPackageDependencies,
  fetchPackageInfo,
  getCache,
  getLatestVersion,
  getNpmFetchOptions,
  getUpmConfigDir,
  loadManifest,
  loadUpmConfig,
  parseEnv,
  parseName,
  parseEditorVersion,
  saveManifest,
  saveUpmConfig
};
