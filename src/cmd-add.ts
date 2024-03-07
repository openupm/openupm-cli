import log from "./logger";
import url from "url";
import { isPackageUrl, PackageUrl } from "./types/package-url";
import {
  loadProjectManifest,
  saveProjectManifest,
} from "./utils/project-manifest-io";
import { parseEnv } from "./utils/env";
import {
  compareEditorVersion,
  tryParseEditorVersion,
} from "./types/editor-version";
import { makeNpmClient } from "./npm-client";
import { DomainName } from "./types/domain-name";
import {
  packageReference,
  PackageReference,
  splitPackageReference,
} from "./types/package-reference";
import { addScope, scopedRegistry } from "./types/scoped-registry";
import {
  addDependency,
  addScopedRegistry,
  addTestable,
  tryGetScopedRegistryByUrl,
} from "./types/project-manifest";
import { CmdOptions } from "./types/options";
import { tryResolve } from "./packument-resolving";
import { SemanticVersion } from "./types/semantic-version";
import { fetchPackageDependencies } from "./dependency-resolving";

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
 * @throws {Error} An unhandled error occurred.
 */
export const add = async function (
  pkgs: PackageReference | PackageReference[],
  options: AddOptions
): Promise<AddResultCode> {
  if (!Array.isArray(pkgs)) pkgs = [pkgs];
  // parse env
  const env = await parseEnv(options, true);
  if (env === null) return 1;

  const client = makeNpmClient();

  const addSingle = async function (pkg: PackageReference): Promise<AddResult> {
    // is upstream package flag
    let isUpstreamPackage = false;
    // parse name
    const [name, requestedVersion] = splitPackageReference(pkg);

    // load manifest
    let manifest = await loadProjectManifest(env.cwd);
    if (manifest === null) return { code: 1, dirty: false };
    // packages that added to scope registry
    const pkgsInScope = Array.of<DomainName>();
    let versionToAdd = requestedVersion;
    if (requestedVersion === undefined || !isPackageUrl(requestedVersion)) {
      let resolveResult = await tryResolve(
        client,
        name,
        requestedVersion,
        env.registry
      );
      if (!resolveResult.isSuccess && env.upstream) {
        resolveResult = await tryResolve(
          client,
          name,
          requestedVersion,
          env.upstreamRegistry
        );
        if (resolveResult.isSuccess) isUpstreamPackage = true;
      }

      if (!resolveResult.isSuccess) {
        if (resolveResult.issue === "PackumentNotFound")
          log.error("404", `package not found: ${name}`);
        else if (resolveResult.issue === "VersionNotFound") {
          const versionList = [...resolveResult.availableVersions]
            .reverse()
            .join(", ");
          log.warn(
            "404",
            `version ${resolveResult.requestedVersion} is not a valid choice of: ${versionList}`
          );
        }
        return { code: 1, dirty: false };
      }

      const packumentVersion = resolveResult.packumentVersion;
      versionToAdd = packumentVersion.version;

      // verify editor version
      if (packumentVersion.unity) {
        const requiredEditorVersion = packumentVersion.unityRelease
          ? packumentVersion.unity + "." + packumentVersion.unityRelease
          : packumentVersion.unity;
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
              return { code: 1, dirty: false };
            }
          }
          if (
            editorVersionResult &&
            requiredEditorVersionResult &&
            compareEditorVersion(
              editorVersionResult,
              requiredEditorVersionResult
            ) < 0
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
              return { code: 1, dirty: false };
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
          requestedVersion,
          true,
          client
        );
        // add depsValid to pkgsInScope.
        depsValid
          .filter((x) => !x.upstream && !x.internal)
          .map((x) => x.name)
          .forEach((name) => pkgsInScope.push(name));
        // print suggestion for depsInvalid
        let isAnyDependencyUnresolved = false;
        depsInvalid.forEach((depObj) => {
          if (
            depObj.reason.issue === "PackumentNotFound" ||
            depObj.reason.issue === "VersionNotFound"
          ) {
            // Not sure why it thinks the manifest can be null here.
            const resolvedVersion = manifest!.dependencies[depObj.name];
            const wasResolved = Boolean(resolvedVersion);
            if (!wasResolved) {
              isAnyDependencyUnresolved = true;
              if (depObj.reason.issue === "VersionNotFound")
                log.notice(
                  "suggest",
                  `to install ${packageReference(
                    depObj.name,
                    depObj.reason.requestedVersion
                  )} or a replaceable version manually`
                );
            }
          }
        });
        if (isAnyDependencyUnresolved) {
          if (!options.force) {
            log.error(
              "missing dependencies",
              "please resolve the issue or run with option -f to ignore the warning"
            );
            return { code: 1, dirty: false };
          }
        }
      } else pkgsInScope.push(name);
    }
    // add to dependencies
    const oldVersion = manifest.dependencies[name];
    // Whether a change was made that requires overwriting the manifest
    let dirty = false;
    // I am not sure why we need this assertion. I'm pretty sure
    // code-logic ensures the correct type.
    manifest = addDependency(
      manifest,
      name,
      versionToAdd as PackageUrl | SemanticVersion
    );
    if (!oldVersion) {
      // Log the added package
      log.notice("manifest", `added ${packageReference(name, versionToAdd)}`);
      dirty = true;
    } else if (oldVersion !== versionToAdd) {
      // Log the modified package version
      log.notice(
        "manifest",
        `modified ${name} ${oldVersion} => ${versionToAdd}`
      );
      dirty = true;
    } else {
      // Log the existed package
      log.notice("manifest", `existed ${packageReference(name, versionToAdd)}`);
    }
    if (!isUpstreamPackage && pkgsInScope.length > 0) {
      let entry = tryGetScopedRegistryByUrl(manifest, env.registry.url);
      if (entry === null) {
        const name = url.parse(env.registry.url).hostname;
        if (name === null) throw new Error("Could not resolve registry name");
        entry = scopedRegistry(name, env.registry.url);
        manifest = addScopedRegistry(manifest, entry);
        dirty = true;
      }
      pkgsInScope.forEach((name) => {
        const wasAdded = addScope(entry!, name);
        if (wasAdded) dirty = true;
      });
    }
    if (options.test) manifest = addTestable(manifest, name);
    // save manifest
    if (dirty) {
      if (!(await saveProjectManifest(env.cwd, manifest)))
        return { code: 1, dirty };
    }
    return { code: 0, dirty };
  };

  // add
  const results = Array.of<AddResult>();
  for (const pkg of pkgs) results.push(await addSingle(pkg));
  const result: AddResult = {
    code: results.filter((x) => x.code !== 0).length > 0 ? 1 : 0,
    dirty: results.filter((x) => x.dirty).length > 0,
  };
  // print manifest notice
  if (result.dirty)
    log.notice("", "please open Unity project to apply changes");
  return result.code;
};
