const { log } = require("./logger");
const {
  env,
  loadManifest,
  parseEnv,
  parseName,
  saveManifest
} = require("./core");

const remove = async function(pkgs, options) {
  if (!Array.isArray(pkgs)) pkgs = [pkgs];
  // parse env
  const envOk = await parseEnv(options, { checkPath: true });
  if (!envOk) return 1;
  // remove
  const results = [];
  for (const pkg of pkgs) results.push(await _remove(pkg));
  const result = {
    code: results.filter(x => x.code != 0).length > 0 ? 1 : 0,
    dirty: results.filter(x => x.dirty).length > 0
  };
  // print manifest notice
  if (result.dirty)
    log.notice("", "please open Unity project to apply changes");
  return result.code;
};

const _remove = async function(pkg) {
  // dirty flag
  let dirty = false;
  // parse name
  let { name, version } = parseName(pkg);
  if (version) {
    log.warn("", `please replace '${name}@${version}' with '${name}'`);
    return { code: 1, dirty };
  }
  // load manifest
  let manifest = loadManifest();
  if (manifest === null) return { code: 1, dirty };
  // not found array
  let pkgsNotFound = [];
  // remove from dependencies
  if (manifest.dependencies) {
    version = manifest.dependencies[name];
    if (version) {
      log.notice("manifest", `removed ${name}@${version}`);
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
    if (!saveManifest(manifest)) return { code: 1, dirty };
  }
  if (pkgsNotFound.length) {
    log.error("404", `package not found: ${pkgsNotFound.join(", ")}`);
    return { code: 1, dirty };
  }
  return { code: 0, dirty };
};

module.exports = remove;
