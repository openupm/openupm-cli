const fs = require("fs");
const keyFileStorage = require("key-file-storage").default;
const log = require("loglevel");
const path = require("path");
const superagent = require("superagent");
const { isConnectionError, is404Error } = require("./error-handler");

const env = {
  registry: "https://package.openupm.com",
  cwd: "",
  manifestPath: ""
};

// Parse env
const parseEnv = function(options, { checkPath }) {
  // log level
  const logLevel = options.parent.verbose ? "debug" : "info";
  log.setLevel(logLevel);
  // registry
  if (options.parent.registry) {
    let registry = options.parent.registry;
    if (!registry.toLowerCase().startsWith("http"))
      registry = "http://" + registry;
    env.registry = registry;
    if (env.registry.endsWith("/")) env.registry = env.registry.slice(0, -1);
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
  const [name, version] = pkg.split("@");
  return { name, version };
};

// Get package info json from registry
const getPackageInfo = async function(name) {
  try {
    let url = `${env.registry}/${name}`;
    log.debug(`http get ${url}`);
    const response = await superagent.get(url).accept("json");
    response.body = JSON.parse(response.text);
    log.debug(`status ${response.status}`);
    log.debug(response.body);
    return response.body;
  } catch (err) {
    if (isConnectionError(err))
      log.error(`can not reach to registry ${env.registry}`);
    else if (is404Error(err)) log.error("package not found");
    else log.error(err);
  }
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

module.exports = {
  env,
  getCache,
  getPackageInfo,
  loadManifest,
  parseEnv,
  parseName,
  saveManifest
};
