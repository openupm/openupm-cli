import log from "./logger";
import url from "url";
import {
  compareEditorVersion,
  env,
  fetchPackageDependencies,
  fetchPackageInfo,
  getLatestVersion,
  loadManifest,
  parseEditorVersion,
  parseEnv,
  parseName,
  saveManifest,
} from "./core";

export type AddOptions = {
  test: boolean;
  force: boolean;
  _global: GlobalOptions;
};

export const add = async function (
  pkgs: PkgNameWithVersion | PkgNameWithVersion[],
  options: AddOptions
): Promise<number> {
  if (!Array.isArray(pkgs)) pkgs = [pkgs];
  // parse env
  const envOk = await parseEnv(options, { checkPath: true });
  if (!envOk) return 1;
  // add
  const results = [];
  for (const pkg of pkgs)
    results.push(
      await _add({ pkg, testables: options.test, force: options.force })
    );
  const result = {
    code: results.filter((x) => x.code != 0).length > 0 ? 1 : 0,
    dirty: results.filter((x) => x.dirty).length > 0,
  };
  // print manifest notice
  if (result.dirty)
    log.notice("", "please open Unity project to apply changes");
  return result.code;
};

const _add = async function ({
  pkg,
  testables,
  force,
}: {
  pkg: PkgNameWithVersion;
  testables: boolean;
  force: boolean;
}) {
  // dirty flag
  let dirty = false;
  // is upstream package flag
  let isUpstreamPackage = false;
  // parse name
  const parseResult = parseName(pkg);
  const name = parseResult.name;
  let version = parseResult.version;

  // load manifest
  const manifest = loadManifest();
  if (manifest === null) return { code: 1, dirty };
  // ensure manifest.dependencies
  if (!manifest.dependencies) {
    manifest.dependencies = {};
  }
  // packages that added to scope registry
  const pkgsInScope: PkgName[] = [];
  const isGitOrLocal =
    version !== undefined &&
    (version.startsWith("git") ||
      version.startsWith("file") ||
      version.startsWith("http"));
  if (!isGitOrLocal) {
    // verify name
    let pkgInfo = await fetchPackageInfo(name);
    if (!pkgInfo && env.upstream) {
      pkgInfo = await fetchPackageInfo(name, env.upstreamRegistry);
      if (pkgInfo) isUpstreamPackage = true;
    }
    if (!pkgInfo) {
      log.error("404", `package not found: ${name}`);
      return { code: 1, dirty };
    }
    // verify version
    const versions = Object.keys(pkgInfo.versions);
    // eslint-disable-next-line require-atomic-updates
    if (!version || version == "latest") version = getLatestVersion(pkgInfo);
    if (versions.filter((x) => x == version).length <= 0) {
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
    const versionInfo = pkgInfo.versions[version];
    // verify editor version
    if (versionInfo.unity) {
      const requiredEditorVersion = versionInfo.unityRelease
        ? versionInfo.unity + "." + versionInfo.unityRelease
        : versionInfo.unity;
      if (env.editorVersion) {
        const editorVersionResult = parseEditorVersion(env.editorVersion);
        const requiredEditorVersionResult = parseEditorVersion(
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
          if (!force) {
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
          if (!force) {
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
      const [depsValid, depsInvalid] = await fetchPackageDependencies({
        name,
        version,
        deep: true,
      });
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
              `to install ${depObj.name}@${depObj.version} or a replaceable version manually`
            );
        }
      });
      if (depsInvalid.filter((x) => !x.resolved).length > 0) {
        if (!force) {
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
  if (version === undefined) throw new Error("Version is undefined");
  const oldVersion = manifest.dependencies[name];
  manifest.dependencies[name] = version;
  if (!oldVersion) {
    // Log the added package
    log.notice("manifest", `added ${name}@${version}`);
    dirty = true;
  } else if (oldVersion != version) {
    // Log the modified package version
    log.notice("manifest", `modified ${name} ${oldVersion} => ${version}`);
    dirty = true;
  } else {
    // Log the existed package
    log.notice("manifest", `existed ${name}@${version}`);
  }
  if (!isUpstreamPackage) {
    // add to scopedRegistries
    if (!manifest.scopedRegistries) {
      manifest.scopedRegistries = [];
      dirty = true;
    }
    const filterEntry = (x: ScopedRegistry): boolean => {
      let addr = x.url || "";
      if (addr.endsWith("/")) addr = addr.slice(0, -1);
      return addr == env.registry;
    };
    if (manifest.scopedRegistries.filter(filterEntry).length <= 0) {
      const name = url.parse(env.registry).hostname;
      if (name === null) throw new Error("Could not resolve registry name");
      manifest.scopedRegistries.push({
        name,
        url: env.registry,
        scopes: [],
      });
      dirty = true;
    }
    const entry = manifest.scopedRegistries.filter(filterEntry)[0];
    // apply pkgsInScope
    const scopesSet = new Set(entry.scopes || []);
    pkgsInScope.push(env.namespace);
    pkgsInScope.forEach((name) => {
      if (!scopesSet.has(name)) {
        scopesSet.add(name);
        dirty = true;
      }
    });
    entry.scopes = Array.from(scopesSet).sort();
  }
  if (testables) {
    if (!manifest.testables) {
      manifest.testables = [];
    }
    if (manifest.testables.indexOf(name) === -1) {
      manifest.testables.push(name);
    }
  }
  // save manifest
  if (dirty) {
    if (!saveManifest(manifest)) return { code: 1, dirty };
  }
  return { code: 0, dirty };
};
