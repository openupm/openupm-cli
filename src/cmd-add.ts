import log from "./logger";
import url from "url";
import { isPackageUrl } from "./types/package-url";
import { tryGetLatestVersion } from "./types/pkg-info";
import { loadManifest, saveManifest } from "./utils/pkg-manifest-io";
import { parseEnv } from "./utils/env";
import {
  compareEditorVersion,
  tryParseEditorVersion,
} from "./types/editor-version";
import { fetchPackageDependencies, fetchPackageInfo } from "./registry-client";
import { DomainName } from "./types/domain-name";
import { SemanticVersion } from "./types/semantic-version";
import {
  packageReference,
  PackageReference,
  splitPackageReference,
} from "./types/package-reference";
import { scopedRegistry } from "./types/scoped-registry";
import {
  addDependency,
  addScopedRegistry,
  addTestable,
  tryGetScopedRegistryByUrl,
} from "./types/pkg-manifest";
import { CmdOptions } from "./types/options";

export type AddOptions = CmdOptions<{
  test?: boolean;
  force?: boolean;
}>;

type AddResultCode = 0 | 1;

type AddResult = {
  dirty: boolean;
  code: AddResultCode;
};

/**
 * @throws Error An unhandled error occurred
 */
export const add = async function (
  pkgs: PackageReference | PackageReference[],
  options: AddOptions
): Promise<AddResultCode> {
  if (!Array.isArray(pkgs)) pkgs = [pkgs];
  // parse env
  const env = await parseEnv(options, true);
  if (env === null) return 1;

  const addSingle = async function (pkg: PackageReference): Promise<AddResult> {
    // dirty flag
    let dirty = false;
    // is upstream package flag
    let isUpstreamPackage = false;
    // parse name
    const split = splitPackageReference(pkg);
    const name = split[0];
    let version = split[1];

    // load manifest
    const manifest = loadManifest(env.cwd);
    if (manifest === null) return { code: 1, dirty };
    // packages that added to scope registry
    const pkgsInScope: DomainName[] = [];
    if (version === undefined || !isPackageUrl(version)) {
      // verify name
      let pkgInfo = await fetchPackageInfo(env.registry, name);
      if (!pkgInfo && env.upstream) {
        pkgInfo = await fetchPackageInfo(env.upstreamRegistry, name);
        if (pkgInfo) isUpstreamPackage = true;
      }
      if (!pkgInfo) {
        log.error("404", `package not found: ${name}`);
        return { code: 1, dirty };
      }
      // verify version
      const versions = Object.keys(pkgInfo.versions) as SemanticVersion[];
      // eslint-disable-next-line require-atomic-updates
      if (!version || version === "latest")
        version = tryGetLatestVersion(pkgInfo);
      if (versions.filter((x) => x === version).length <= 0) {
        log.warn(
          "404",
          `version ${version} is not a valid choice of: ${versions
            .reverse()
            .join(", ")}`
        );
        return { code: 1, dirty };
      }

      if (version === undefined)
        throw new Error("Could not determine package version to add");
      const versionInfo = pkgInfo.versions[version]!;
      // verify editor version
      if (versionInfo.unity) {
        const requiredEditorVersion = versionInfo.unityRelease
          ? versionInfo.unity + "." + versionInfo.unityRelease
          : versionInfo.unity;
        if (env.editorVersion) {
          const editorVersionResult = tryParseEditorVersion(env.editorVersion);
          const requiredEditorVersionResult = tryParseEditorVersion(
            requiredEditorVersion
          );
          if (!editorVersionResult) {
            log.warn(
              "editor.version",
              `${env.editorVersion} is unknown, the editor version check is disabled`
            );
          }
          if (!requiredEditorVersionResult) {
            log.warn("package.unity", `${requiredEditorVersion} is not valid`);
            if (!options.force) {
              log.notice(
                "suggest",
                "contact the package author to fix the issue, or run with option -f to ignore the warning"
              );
              return { code: 1, dirty };
            }
          }
          if (
            editorVersionResult &&
            requiredEditorVersionResult &&
            compareEditorVersion(env.editorVersion, requiredEditorVersion) < 0
          ) {
            log.warn(
              "editor.version",
              `requires ${requiredEditorVersion} but found ${env.editorVersion}`
            );
            if (!options.force) {
              log.notice(
                "suggest",
                `upgrade the editor to ${requiredEditorVersion}, or run with option -f to ignore the warning`
              );
              return { code: 1, dirty };
            }
          }
        }
      }
      // pkgsInScope
      if (!isUpstreamPackage) {
        const [depsValid, depsInvalid] = await fetchPackageDependencies(
          env.registry,
          env.upstreamRegistry,
          name,
          version,
          true
        );
        // add depsValid to pkgsInScope.
        depsValid
          .filter((x) => !x.upstream && !x.internal)
          .map((x) => x.name)
          .forEach((name) => pkgsInScope.push(name));
        // print suggestion for depsInvalid
        depsInvalid.forEach((depObj) => {
          if (depObj.reason == "package404" || depObj.reason == "version404") {
            const resolvedVersion = manifest.dependencies[depObj.name];
            depObj.resolved = Boolean(resolvedVersion);
            if (!depObj.resolved)
              log.notice(
                "suggest",
                `to install ${packageReference(
                  depObj.name,
                  depObj.version
                )} or a replaceable version manually`
              );
          }
        });
        if (depsInvalid.filter((x) => !x.resolved).length > 0) {
          if (!options.force) {
            log.error(
              "missing dependencies",
              "please resolve thie issue or run with option -f to ignore the warning"
            );
            return { code: 1, dirty };
          }
        }
      } else pkgsInScope.push(name);
    }
    // add to dependencies
    const oldVersion = manifest.dependencies[name];
    addDependency(manifest, name, version);
    if (!oldVersion) {
      // Log the added package
      log.notice("manifest", `added ${packageReference(name, version)}`);
      dirty = true;
    } else if (oldVersion != version) {
      // Log the modified package version
      log.notice("manifest", `modified ${name} ${oldVersion} => ${version}`);
      dirty = true;
    } else {
      // Log the existed package
      log.notice("manifest", `existed ${packageReference(name, version)}`);
    }
    if (!isUpstreamPackage) {
      // add to scopedRegistries
      if (!manifest.scopedRegistries) {
        manifest.scopedRegistries = [];
        dirty = true;
      }
      let entry = tryGetScopedRegistryByUrl(manifest, env.registry.url);
      if (entry === null) {
        const name = url.parse(env.registry.url).hostname;
        if (name === null) throw new Error("Could not resolve registry name");
        entry = scopedRegistry(name, env.registry.url);
        addScopedRegistry(manifest, entry);
        dirty = true;
      }
      // apply pkgsInScope
      const scopesSet = new Set(entry.scopes || []);
      pkgsInScope.forEach((name) => {
        if (!scopesSet.has(name)) {
          scopesSet.add(name);
          dirty = true;
        }
      });
      entry.scopes = Array.from(scopesSet).sort();
    }
    if (options.test) addTestable(manifest, name);
    // save manifest
    if (dirty) {
      if (!saveManifest(env.cwd, manifest)) return { code: 1, dirty };
    }
    return { code: 0, dirty };
  };

  // add
  const results = [];
  for (const pkg of pkgs) results.push(await addSingle(pkg));
  const result: AddResult = {
    code: results.filter((x) => x.code != 0).length > 0 ? 1 : 0,
    dirty: results.filter((x) => x.dirty).length > 0,
  };
  // print manifest notice
  if (result.dirty)
    log.notice("", "please open Unity project to apply changes");
  return result.code;
};
