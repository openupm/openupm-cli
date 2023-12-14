import log from "./logger";
import { loadManifest, saveManifest } from "./utils/pkg-manifest-io";
import { env, parseEnv } from "./utils/env";
import { isDomainName } from "./types/domain-name";
import {
  packageReference,
  PackageReference,
  splitPackageReference,
} from "./types/package-reference";
import { hasScope, removeScope } from "./types/scoped-registry";
import {
  removeDependency,
  tryGetScopedRegistryByUrl,
} from "./types/pkg-manifest";
import { CmdOptions } from "./types/options";

export type RemoveOptions = CmdOptions;

export const remove = async function (
  pkgs: PackageReference[] | PackageReference,
  options: RemoveOptions
) {
  if (!Array.isArray(pkgs)) pkgs = [pkgs];
  // parse env
  const envOk = await parseEnv(options, true);
  if (!envOk) return 1;

  const removeSingle = async function (pkg: PackageReference) {
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
    const manifest = loadManifest(env.manifestPath);
    if (manifest === null) return { code: 1, dirty };
    // not found array
    const pkgsNotFound = [];
    version = manifest.dependencies[name];
    if (version) {
      log.notice("manifest", `removed ${packageReference(name, version)}`);
      removeDependency(manifest, name);
      dirty = true;
    } else pkgsNotFound.push(pkg);

    const entry = tryGetScopedRegistryByUrl(manifest, env.registry);
    if (entry !== null) {
      if (hasScope(entry, name)) {
        removeScope(entry, name);
        const scopesSet = new Set(entry.scopes);
        if (isDomainName(env.namespace)) scopesSet.add(env.namespace);
        entry.scopes = Array.from(scopesSet).sort();
        dirty = true;
      }
    }
    // save manifest
    if (dirty) {
      if (!saveManifest(env.manifestPath, manifest)) return { code: 1, dirty };
    }
    if (pkgsNotFound.length) {
      log.error("404", `package not found: ${pkgsNotFound.join(", ")}`);
      return { code: 1, dirty };
    }
    return { code: 0, dirty };
  };

  // remove
  const results = [];
  for (const pkg of pkgs) results.push(await removeSingle(pkg));
  const result = {
    code: results.filter((x) => x.code != 0).length > 0 ? 1 : 0,
    dirty: results.filter((x) => x.dirty).length > 0,
  };
  // print manifest notice
  if (result.dirty)
    log.notice("", "please open Unity project to apply changes");
  return result.code;
};
