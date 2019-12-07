const log = require("./logger");
const url = require("url");
const {
  env,
  getPackageInfo,
  getLatestVersion,
  loadManifest,
  parseEnv,
  parseName,
  saveManifest
} = require("./core");

const add = async function(pkgs, options) {
  if (!Array.isArray(pkgs)) pkgs = [pkgs];
  // parse env
  if (!parseEnv(options, { checkPath: true })) return 1;
  // add
  const results = await Promise.all(pkgs.map(_add));
  const result = {
    code: results.filter(x => x.code != 0).length > 0 ? 1 : 0,
    dirty: results.filter(x => x.dirty).length > 0
  };
  // print manifest notice
  if (result.dirty)
    log.info("manifest updated, please open unity project to apply changes");
  return result.code;
};

const _add = async function(pkg) {
  // dirty flag
  let dirty = false;
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
    if (!pkgInfo) return { code: 1, dirty };
    // verify version
    const versions = Object.keys(pkgInfo.versions);
    // eslint-disable-next-line require-atomic-updates
    if (!version || version == "latest") version = getLatestVersion(pkgInfo);
    if (versions.filter(x => x == version).length <= 0) {
      log.info(`version ${version} is not a valid choice of:`);
      log.info(`${versions.reverse().join(", ")}`);
      return { code: 1, dirty };
    }
  }
  // load manifest
  let manifest = loadManifest();
  if (manifest === null) return { code: 1, dirty };
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
    if (!saveManifest(manifest)) return { code: 1, dirty };
  }
  return { code: 0, dirty };
};

module.exports = add;
