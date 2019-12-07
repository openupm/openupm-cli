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
  if (!parseEnv(options, { checkPath: true })) return 1;
  let { name, version } = parseName(pkg);
  if (version) {
    log.error(
      "remove command doesn't support name@version, using name instead"
    );
    return 1;
  }
  // load manifest
  let manifest = loadManifest();
  if (manifest === null) return 1;
  // dirty flag
  let dirty = false;
  // not found array
  let pkgsNotFound = [];
  // remove from dependencies
  if (manifest.dependencies) {
    version = manifest.dependencies[name];
    if (version) {
      log.info(`removed: ${name}@${version}`);
      delete manifest.dependencies[name];
      dirty = true;
    } else pkgsNotFound.push(pkg);
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
        let scopesSet = new Set(entry.scopes);
        scopesSet.add(env.namespace);
        entry.scopes = Array.from(scopesSet).sort();
        dirty = true;
      }
    }
  }
  // save manifest
  if (dirty) {
    if (!saveManifest(manifest)) return 1;
    // print manifest notice
    log.info("manifest updated, please open unity project to apply changes");
  }
  if (pkgsNotFound.length) {
    log.error(`package not found: ${pkgsNotFound.join(", ")}`);
    return 1;
  }
  return 0;
};
