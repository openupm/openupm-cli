const log = require("loglevel");
const {
  env,
  loadManifest,
  parseEnv,
  parseName,
  saveManifest
} = require("./core");

module.exports = async function(pkg, options) {
  // parse env
  if (!parseEnv(options, { checkPath: true })) process.exit(1);
  let { name, version } = parseName(pkg);
  if (version) {
    log.error(
      "remove command doesn't support name@version, using name instead"
    );
    process.exit(1);
  }
  // load manifest
  let manifest = loadManifest();
  if (manifest === null) process.exit(1);
  // dirty flag
  let dirty = false;
  // remove from dependencies
  if (manifest.dependencies) {
    version = manifest.dependencies[name];
    if (version) {
      log.info(`removed: ${name}@${version}`);
      delete manifest.dependencies[name];
      dirty = true;
    }
  }
  // remove from scopedRegistries
  if (manifest.scopedRegistries) {
    const filterEntry = x => {
      let url = x.url || "";
      if (url.endsWith("/")) url = url.slice(0, -1);
      return url == env.registry;
    };
    let entires = manifest.scopedRegistries.filter(filterEntry);
    if (entires.length > 0) {
      let entry = entires[0];
      const index = entry.scopes.indexOf(name);
      if (index > -1) {
        entry.scopes.splice(index, 1);
        dirty = true;
      }
    }
  }
  // save manifest
  if (dirty) {
    if (!saveManifest(manifest)) process.exit(1);
    // print manifest notice
    log.info("manifest updated, please open unity project to apply changes");
  }
};
