const superagent = require("superagent");
const path = require("path");
const fs = require("fs");

const env = {
  registry: "https://package.openupm.com",
  cwd: "",
  manifestPath: ""
};

// Parse env
const parseEnv = function(options) {
  // registry
  if (options.parent.registry) {
    let registry = options.parent.registry;
    if (!registry.toLowerCase().startsWith("http"))
      registry = "http://" + registry;
    env.registry = registry;
  }
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

module.exports = {
  env,
  getPackageInfo,
  loadManifest,
  parseEnv,
  saveManifest
};
