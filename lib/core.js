const path = require("path");
const keyFileStorage = require("key-file-storage").default;
const fs = require("fs");
const superagent = require("superagent");

const env = {
  registry: "https://package.openupm.com",
  cwd: "",
  manifestPath: ""
};

// Parse env
const parseEnv = function(options, { checkPath }) {
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
      console.error(`can not resolve path ${cwd}`);
      return false;
    }
    env.cwd = cwd;
  } else env.cwd = process.cwd();
  // manifest path
  let manifestPath = path.join(env.cwd, "Packages/manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(`can not locate manifest.json at path ${manifestPath}`);
    return false;
  } else env.manifestPath = manifestPath;
  // return
  return true;
};

// Get package info json from registry
const getPackageInfo = async function(name) {
  try {
    let url = `${env.registry}/${name}`;
    const response = await superagent.get(url);
    response.body = JSON.parse(response.text);
    const data = response.body;
    return data;
  } catch (err) {
    if (!err.response)
      console.error(`can not reach to registry ${env.registry}`);
    else if (err.response.notFound) console.log("package not found");
    else console.error(err);
  }
};

// Load manifest json file
const loadManifest = function() {
  let text = fs.readFileSync(env.manifestPath, { encoding: "utf8" });
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("can not parse manifest json file");
    console.error(err);
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
    console.error("can not write manifest json file");
    console.error(err);
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
  saveManifest
};
