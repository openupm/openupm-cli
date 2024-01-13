import log from "./logger";
import {
  loadProjectManifest,
  saveProjectManifest,
} from "./utils/project-manifest-io";
import { parseEnv } from "./utils/env";
import {
  packageReference,
  PackageReference,
  splitPackageReference,
} from "./types/package-reference";
import { hasScope, removeScope } from "./types/scoped-registry";
import {
  removeDependency,
  tryGetScopedRegistryByUrl,
} from "./types/project-manifest";
import { CmdOptions } from "./types/options";

export type RemoveOptions = CmdOptions;

type RemoveResultCode = 0 | 1;

type RemoveResult = {
  code: RemoveResultCode;
  dirty: boolean;
};

export async function remove(
  pkgs: PackageReference[] | PackageReference,
  options: RemoveOptions
): Promise<RemoveResultCode> {
  if (!Array.isArray(pkgs)) pkgs = [pkgs];
  // parse env
  const env = await parseEnv(options, true);
  if (env === null) return 1;

  const removeSingle = async (pkg: PackageReference): Promise<RemoveResult> => {
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
    const manifest = loadProjectManifest(env.cwd);
    if (manifest === null) return { code: 1, dirty };
    // not found array
    const pkgsNotFound = [];
    version = manifest.dependencies[name];
    if (version) {
      log.notice("manifest", `removed ${packageReference(name, version)}`);
      removeDependency(manifest, name);
      dirty = true;
    } else pkgsNotFound.push(pkg);

    const entry = tryGetScopedRegistryByUrl(manifest, env.registry.url);
    if (entry !== null) {
      if (hasScope(entry, name)) {
        removeScope(entry, name);
        const scopesSet = new Set(entry.scopes);
        entry.scopes = Array.from(scopesSet).sort();
        dirty = true;
      }
    }
    // save manifest
    if (dirty) {
      if (!saveProjectManifest(env.cwd, manifest)) return { code: 1, dirty };
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
  const result: RemoveResult = {
    code: results.filter((x) => x.code != 0).length > 0 ? 1 : 0,
    dirty: results.filter((x) => x.dirty).length > 0,
  };
  // print manifest notice
  if (result.dirty)
    log.notice("", "please open Unity project to apply changes");
  return result.code;
}
