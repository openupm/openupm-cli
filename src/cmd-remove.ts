import log from "./logger";
import {
  tryLoadProjectManifest,
  trySaveProjectManifest,
} from "./utils/project-manifest-io";
import { parseEnv } from "./utils/env";
import {
  hasVersion,
  packageReference,
  PackageReference,
} from "./types/package-reference";
import { removeScope } from "./types/scoped-registry";
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

export const remove = async function (
  pkgs: PackageReference[] | PackageReference,
  options: RemoveOptions
): Promise<RemoveResultCode> {
  if (!Array.isArray(pkgs)) pkgs = [pkgs];
  // parse env
  const envResult = await parseEnv(options, true);
  if (!envResult.isOk()) return 1;
  const env = envResult.value;

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
    const manifestResult = await tryLoadProjectManifest(env.cwd);
    if (!manifestResult.isOk()) return { code: 1, dirty };
    let manifest = manifestResult.value;

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

    const entry = tryGetScopedRegistryByUrl(manifest, env.registry.url);
    if (entry !== null) {
      const scopeWasRemoved = removeScope(entry, pkg);
      if (scopeWasRemoved) dirty = true;
    }
    // save manifest
    if (dirty) {
      if (!(await trySaveProjectManifest(env.cwd, manifest)).isOk())
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
