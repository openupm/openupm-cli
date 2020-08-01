const _ = require("lodash");
const fs = require("fs");
const keyFileStorage = require("key-file-storage").default;
const isIp = require("is-ip");
const { log } = require("./logger");
const path = require("path");
const os = require("os");
const superagent = require("superagent");
// extend with Request#proxy()
require("superagent-proxy")(superagent);
const url = require("url");
const {
  isConnectionError,
  is404Error,
  is503Error
} = require("./error-handler");

const env = {};

// Parse env
const parseEnv = function(options, { checkPath }) {
  // set defaults
  env.registry = "https://package.openupm.com";
  env.namespace = "com.openupm";
  env.cwd = "";
  env.manifestPath = "";
  env.upstream = true;
  env.upstreamRegistry = "https://packages.unity.com";
  // log level
  const logLevel = options.parent.verbose ? "debug" : "info";
  log.setLevel(logLevel);
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
  if (!checkPath) return true;
  // cwd
  if (options.parent.chdir) {
    let cwd = path.resolve(options.parent.chdir);
    if (!fs.existsSync(cwd)) {
      log.error(`can not resolve path ${cwd}`);
      return false;
    }
    env.cwd = cwd;
  } else env.cwd = process.cwd();
  // manifest path
  let manifestPath = path.join(env.cwd, "Packages/manifest.json");
  if (!fs.existsSync(manifestPath)) {
    log.error(`can not locate manifest.json at path ${manifestPath}`);
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

// Superagent.get with proxy
const httpGet = function(url) {
  const req = superagent.get(url);
  var proxy = process.env.http_proxy;
  if (proxy) {
    req.proxy(proxy);
  }
  return req;
};

// Fetch package info json from registry
const fetchPackageInfo = async function(name, registry) {
  if (!registry) registry = env.registry;
  log.debug(`fetchPackageInfo: ${name} registry=${registry}`);
  try {
    let pkgUrl = `${registry}/${name}`;
    log.debug(`http get ${pkgUrl}`);
    const response = await httpGet(pkgUrl).accept("json");
    response.body = JSON.parse(response.text);
    log.debug(`status ${response.status}`);
    log.debug(response.body);
    return response.body;
  } catch (err) {
    if (err.response && err.response.status)
      log.debug(`status ${err.response.status}`);
    if (isConnectionError(err))
      log.error(`can not reach to registry ${registry}`);
    else if (is503Error(err))
      log.error(
        `fetchPackageInfo: service unavailable. name=${name} registry=${registry}`
      );
    else if (!is404Error(err)) log.error(err);
  }
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
  log.debug(`fetchPackageDependencies: ${name}@${version} deep=${deep}`);
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
          log.warn(`invalid dep: ${entry.name}`);
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
            `package ${entry.name}@${
              entry.version
            } is not a valid choice of ${versions.reverse().join(", ")}`
          );
          // eslint-disable-next-line require-atomic-updates
          validDep.version = entry.version = getLatestVersion(pkgInfo);
          log.warn(`fall back to ${entry.name}@${entry.version}`);
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
      log.debug(
        `valid dep: ${entry.name}@${entry.version} ${
          validDep.module ? "module " : ""
        }${validDep.upstream ? "upstream" : ""}`
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
      log.error("file Packages/manifest.json does not exist");
    else {
      log.error(
        `failed to parse Packages/manifest.json at ${env.manifestPath}`
      );
      log.error(err.message);
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
    log.error("can not write manifest json file");
    log.error(err.message);
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

module.exports = {
  env,
  getCache,
  cleanCache,
  fetchPackageInfo,
  fetchPackageDependencies,
  getLatestVersion,
  httpGet,
  loadManifest,
  parseEnv,
  parseName,
  saveManifest
};
