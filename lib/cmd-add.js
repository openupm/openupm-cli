const url = require("url");
const {
  env,
  getPackageInfo,
  loadManifest,
  parseEnv,
  saveManifest
} = require("./core");

module.exports = async function(name, version, options) {
  // parse env
  if (!parseEnv(options)) process.exit(1);
  // verify name
  let pkgInfo = await getPackageInfo(name);
  if (!pkgInfo) process.exit(1);
  // verify version
  const versions = Object.keys(pkgInfo.versions);
  if (!version || version == "latest") version = pkgInfo["dist-tags"]["latest"];
  if (versions.filter(x => x == version).length <= 0) {
    console.log(`version ${version} is not a valid choice of:`);
    console.log(`${versions.reverse().join(", ")}`);
    process.exit(1);
  }
  // load manifest
  let manifest = loadManifest();
  if (manifest === null) process.exit(1);
  // dirty flag
  let dirty = false;
  // add to dependencies
  if (!manifest.dependencies) {
    manifest.dependencies = {};
    dirty = true;
  }
  const oldVersion = manifest.dependencies[name];
  manifest.dependencies[name] = version;
  if (!oldVersion) {
    console.log(`added: ${name}@${version}`);
    dirty = true;
  } else if (oldVersion != version) {
    console.log(`modified: ${name} ${oldVersion} => ${version}`);
    dirty = true;
  }
  // add to scopedRegistries
  if (!manifest.scopedRegistries) {
    manifest.scopedRegistries = [];
    dirty = true;
  }
  const filterEntry = x => {
    let url = x.url || "";
    if (url.endsWith("/")) url = url.slice(0, -1);
    return url == env.registry;
  };
  if (manifest.scopedRegistries.filter(filterEntry).length <= 0) {
    manifest.scopedRegistries.push({
      name: url.parse(env.registry).hostname,
      url: env.registry,
      scopes: []
    });
    dirty = true;
  }
  let entry = manifest.scopedRegistries.filter(filterEntry)[0];
  let scopesSet = new Set(entry.scopes || []);
  if (!scopesSet.has(name)) {
    scopesSet.add(name);
    dirty = true;
  }
  entry.scopes = Array.from(scopesSet).sort();
  // save manifest
  if (dirty) {
    if (!saveManifest(manifest)) process.exit(1);
    // print manifest notice
    console.log("manifest updated, please open unity project to apply changes");
  }
};
