const log = require("loglevel");
const url = require("url");
const {
  env,
  getPackageInfo,
  loadManifest,
  parseEnv,
  parseName,
  saveManifest
} = require("./core");

module.exports = async function(pkg, options) {
  // parse env
  if (!parseEnv(options, { checkPath: true })) process.exit(1);
  // parse name
  let { name, version } = parseName(pkg);
  const isGitOrLocal =
    version &&
    (version.startsWith("git") ||
      version.startsWith("file") ||
      version.startsWith("http"));
  if (!isGitOrLocal) {
    // verify name
    const pkgInfo = await getPackageInfo(name);
    if (!pkgInfo) process.exit(1);
    // verify version
    const versions = Object.keys(pkgInfo.versions);
    if (!version || version == "latest")
      // eslint-disable-next-line require-atomic-updates
      version = pkgInfo["dist-tags"]["latest"];
    if (versions.filter(x => x == version).length <= 0) {
      log.info(`version ${version} is not a valid choice of:`);
      log.info(`${versions.reverse().join(", ")}`);
      process.exit(1);
    }
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
    log.info(`added: ${name}@${version}`);
    dirty = true;
  } else if (oldVersion != version) {
    log.info(`modified: ${name} ${oldVersion} => ${version}`);
    dirty = true;
  } else {
    // Log add package statement anyway
    log.info(`added: ${name}@${version}`);
  }
  // add to scopedRegistries
  if (!manifest.scopedRegistries) {
    manifest.scopedRegistries = [];
    dirty = true;
  }
  const filterEntry = x => {
    let addr = x.url || "";
    if (addr.endsWith("/")) addr = addr.slice(0, -1);
    return addr == env.registry;
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
  // scopes
  let scopesSet = new Set(entry.scopes || []);
  if (!scopesSet.has(name)) {
    scopesSet.add(name);
    dirty = true;
  }
  scopesSet.add(env.namespace);
  entry.scopes = Array.from(scopesSet).sort();
  // save manifest
  if (dirty) {
    if (!saveManifest(manifest)) process.exit(1);
    // print manifest notice
    log.info("manifest updated, please open unity project to apply changes");
  }
};
