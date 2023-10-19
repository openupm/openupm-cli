import log from "./logger";
import { env, loadManifest, parseEnv, parseName, saveManifest } from "./core";

export type RemoveOptions = {
  _global: GlobalOptions;
};

export const remove = async function (
  pkgs: Pkg[] | Pkg,
  options: RemoveOptions
) {
  if (!Array.isArray(pkgs)) pkgs = [pkgs];
  // parse env
  const envOk = await parseEnv(options, { checkPath: true });
  if (!envOk) return 1;
  // remove
  const results = [];
  for (const pkg of pkgs) results.push(await _remove(pkg));
  const result = {
    code: results.filter((x) => x.code != 0).length > 0 ? 1 : 0,
    dirty: results.filter((x) => x.dirty).length > 0,
  };
  // print manifest notice
  if (result.dirty)
    log.notice("", "please open Unity project to apply changes");
  return result.code;
};

const _remove = async function (pkg: Pkg) {
  // dirty flag
  let dirty = false;
  // parse name
  let { name, version } = parseName(pkg);
  if (version) {
    log.warn("", `please replace '${name}@${version}' with '${name}'`);
    return { code: 1, dirty };
  }
  // load manifest
  const manifest = loadManifest();
  if (manifest === null) return { code: 1, dirty };
  // not found array
  const pkgsNotFound = [];
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
    const filterEntry = (x: ScopedRegistry) => {
      let url = x.url || "";
      if (url.endsWith("/")) url = url.slice(0, -1);
      return url == env.registry;
    };
    const entires = manifest.scopedRegistries.filter(filterEntry);
    if (entires.length > 0) {
      const entry = entires[0];
      const index = entry.scopes.indexOf(name);
      if (index > -1) {
        entry.scopes.splice(index, 1);
        const scopesSet = new Set(entry.scopes);
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
