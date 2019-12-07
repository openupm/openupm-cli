const fs = require("fs");
const keyFileStorage = require("key-file-storage").default;
const isIp = require("is-ip");
const log = require("./logger");
const path = require("path");
const superagent = require("superagent");
const url = require("url");
const { isConnectionError, is404Error } = require("./error-handler");

const env = {};

// Parse env
const parseEnv = function(options, { checkPath }) {
  // set defaults
  env.registry = "https://package.openupm.com";
  env.namespace = "com.openupm";
  env.cwd = "";
  env.manifestPath = "";
  env.upstream = true;
  env.upstreamRegistry = "https://api.bintray.com/npm/unity/unity";
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

// parse name to {name, version}
const parseName = function(pkg) {
  const segs = pkg.split("@");
  const name = segs[0];
  const version =
    segs.length > 1 ? segs.slice(1, segs.length).join("@") : undefined;
  return { name, version };
};

// Get package info json from registry
const getPackageInfo = async function(name) {
  try {
    let pkgUrl = `${env.registry}/${name}`;
    log.debug(`http get ${pkgUrl}`);
    const response = await superagent.get(pkgUrl).accept("json");
    response.body = JSON.parse(response.text);
    log.debug(`status ${response.status}`);
    log.debug(response.body);
    return response.body;
  } catch (err) {
    if (isConnectionError(err))
      log.error(`can not reach to registry ${env.registry}`);
    else if (is404Error(err)) log.error(`package not found: ${name}`);
    else log.error(err);
  }
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
  const homeDir =
    process.platform === "win32" ? process.env.HOMEPATH : process.env.HOME;
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
  getPackageInfo,
  getLatestVersion,
  loadManifest,
  parseEnv,
  parseName,
  saveManifest
};
