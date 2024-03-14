import log from "./logger";
import {
  loadProjectManifest,
  saveProjectManifest,
} from "./utils/project-manifest-io";
import { parseEnv } from "./utils/env";
import {
  hasVersion,
  packageReference,
  PackageReference,
} from "./types/package-reference";
import { removeScope } from "./types/scoped-registry";
import { mapScopedRegistry, removeDependency } from "./types/project-manifest";
import { CmdOptions } from "./types/options";
import { areArraysEqual } from "./utils/array-utils";

export type RemoveOptions = CmdOptions;

type RemoveResultCode = 0 | 1;

type RemoveResult = {
  code: RemoveResultCode;
  dirty: boolean;
};

export const remove = async function (
  pkgs: PackageReference[] | PackageReference,
  options: RemoveOptions
): Promise<RemoveResultCode> {
  if (!Array.isArray(pkgs)) pkgs = [pkgs];
  // parse env
  const env = await parseEnv(options, true);
  if (env === null) return 1;

  const removeSingle = async function (
    pkg: PackageReference
  ): Promise<RemoveResult> {
    // dirty flag
    let dirty = false;
    // parse name
    if (hasVersion(pkg)) {
      log.warn("", `please do not specify a version (Write only '${pkg}').`);
      return { code: 1, dirty };
    }
    // load manifest
    let manifest = await loadProjectManifest(env.cwd);
    if (manifest === null) return { code: 1, dirty };
    // not found array
    const pkgsNotFound = Array.of<PackageReference>();
    const versionInManifest = manifest.dependencies[pkg];
    if (versionInManifest) {
      log.notice(
        "manifest",
        `removed ${packageReference(pkg, versionInManifest)}`
      );
      manifest = removeDependency(manifest, pkg);
      dirty = true;
    } else pkgsNotFound.push(pkg);

    manifest = mapScopedRegistry(manifest, env.registry.url, (initial) => {
      if (initial === null) return null;

      const updated = removeScope(initial, pkg);
      dirty = !areArraysEqual(updated.scopes, initial.scopes) || dirty;
      return updated;
    });

    // save manifest
    if (dirty) {
      if (!(await saveProjectManifest(env.cwd, manifest)))
        return { code: 1, dirty };
    }
    if (pkgsNotFound.length) {
      log.error("404", `package not found: ${pkgsNotFound.join(", ")}`);
      return { code: 1, dirty };
    }
    return { code: 0, dirty };
  };

  // remove
  const results = Array.of<RemoveResult>();
  for (const pkg of pkgs) results.push(await removeSingle(pkg));
  const result: RemoveResult = {
    code: results.filter((x) => x.code !== 0).length > 0 ? 1 : 0,
    dirty: results.filter((x) => x.dirty).length > 0,
  };
  // print manifest notice
  if (result.dirty)
    log.notice("", "please open Unity project to apply changes");
  return result.code;
};
