import log from "./logger";
import { GlobalOptions } from "./types/global";
import { loadManifest, saveManifest } from "./utils/manifest";
import { env, parseEnv } from "./utils/env";
import { isDomainName } from "./types/domain-name";
import {
  packageReference,
  PackageReference,
  splitPackageReference,
} from "./types/package-reference";
import { hasScope, removeScope, ScopedRegistry } from "./types/scoped-registry";

export type RemoveOptions = {
  _global: GlobalOptions;
};

export const remove = async function (
  pkgs: PackageReference[] | PackageReference,
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

const _remove = async function (pkg: PackageReference) {
  // dirty flag
  let dirty = false;
  // parse name
  const split = splitPackageReference(pkg);
  const name = split[0];
  let version = split[1];
  if (version) {
    log.warn(
      "",
      `please replace '${packageReference(name, version)}' with '${name}'`
    );
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
      log.notice("manifest", `removed ${packageReference(name, version)}`);
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
      if (hasScope(entry, name)) {
        removeScope(entry, name);
        const scopesSet = new Set(entry.scopes);
        if (isDomainName(env.namespace)) scopesSet.add(env.namespace);
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
