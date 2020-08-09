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
    let cwd = path.resolve(options.parent.chdir);
    if (!fs.existsSync(cwd)) {
      log.error("env", `can not resolve path ${cwd}`);
      return false;
    }
    env.cwd = cwd;
  } else env.cwd = process.cwd();
  // manifest path
  let manifestPath = path.join(env.cwd, "Packages/manifest.json");
  if (!fs.existsSync(manifestPath)) {
    log.error(
      "manifest",
      `can not locate manifest.json at path ${manifestPath}`
    );
    return false;
  } else env.manifestPath = manifestPath;
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

/* Fetch package dependencies
  [
    {
      name,
      version,
      upstream,   // whether belongs to upstream registry
      self,       // whether is the source package
      module,     // whether is an unity module
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
  const validDeps = [];
  // cached dict: {pkg-name: pkgInfo}
  const cachedPacakgeInfoDict = {};
  while (pendingList.length > 0) {
    const entry = pendingList.shift();
    if (processedList.find(x => _.isEqual(x, entry)) === undefined) {
      // add entry to processed list
      processedList.push(entry);
      // create valid depedenency structure
      const validDep = {
        ...entry,
        module: /com.unity.modules/i.test(entry.name),
        upstream: false,
        self: entry.name == name
      };
      if (!validDep.module) {
        // try fetching package info from cache
        let { pkgInfo, upstream } = _.get(cachedPacakgeInfoDict, entry.name, {
          pkgInfo: null,
          upstream: false
        });
        if (pkgInfo) {
          validDep.upstream = upstream;
        }
        // try fetching package info from the default registry
        if (!pkgInfo) {
          pkgInfo = await fetchPackageInfo(entry.name);
          if (pkgInfo) {
            validDep.upstream = false;
            cachedPacakgeInfoDict[entry.name] = { pkgInfo, upstream: false };
          }
        }
        // try fetching package info from the upstream registry
        if (!pkgInfo) {
          pkgInfo = await fetchPackageInfo(entry.name, env.upstreamRegistry);
          if (pkgInfo) {
            validDep.upstream = true;
            cachedPacakgeInfoDict[entry.name] = { pkgInfo, upstream: true };
          }
        }
        // handle package not exist
        if (!pkgInfo) {
          log.warn("404", `package not found: ${entry.name}`);
          continue;
        }
        // verify version
        const versions = Object.keys(pkgInfo.versions);
        if (!entry.version || entry.version == "latest") {
          // eslint-disable-next-line require-atomic-updates
          validDep.version = entry.version = getLatestVersion(pkgInfo);
        }
        // handle version not exist
        if (!versions.find(x => x == entry.version)) {
          log.warn(
            "404",
            `package ${entry.name}@${
              entry.version
            } is not a valid choice of ${versions.reverse().join(", ")}`
          );
          // eslint-disable-next-line require-atomic-updates
          validDep.version = entry.version = getLatestVersion(pkgInfo);
          log.warn("404", `fall back to ${entry.name}@${entry.version}`);
        }
        // add dependencies to pending list
        if (validDep.self || deep) {
          const deps = _.toPairs(
            pkgInfo.versions[entry.version]["dependencies"]
          ).map(x => {
            return { name: x[0], version: x[1] };
          });
          deps.forEach(x => pendingList.push(x));
        }
      }
      validDeps.push(validDep);
      log.verbose(
        "dependency",
        `${entry.name}@${entry.version} ${validDep.module ? "[module] " : ""}${
          validDep.upstream ? "[upstream]" : ""
        }`
      );
    }
  }
  return validDeps;
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

module.exports = {
  cleanCache,
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
  saveManifest,
  saveUpmConfig
};
