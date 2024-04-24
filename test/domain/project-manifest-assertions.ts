import { DomainName } from "../../src/domain/domain-name";
import { SemanticVersion } from "../../src/domain/semantic-version";
import { PackageUrl } from "../../src/domain/package-url";
import { UnityProjectManifest } from "../../src/domain/project-manifest";

expect.extend({
  toHaveDependency(
    manifest: UnityProjectManifest,
    name: DomainName,
    version?: SemanticVersion | PackageUrl
  ) {
    const dependency = manifest.dependencies[name];
    const hasDependency =
      dependency !== undefined &&
      (version === undefined || dependency === version);

    return {
      pass: hasDependency,
      message: () =>
        dependency === undefined
          ? `Expected manifest to have dependency "${name}" but it was missing.`
          : `Expected manifest to have dependency "${name}:${version}" but it had version "${dependency}".`,
    };
  },

  toHaveDependencies(manifest: UnityProjectManifest) {
    const hasAnyDependency = Object.keys(manifest.dependencies).length > 0;
    return {
      pass: hasAnyDependency,
      message: () => "Expected manifest to have any dependencies.",
    };
  },

  toHaveScope(manifest: UnityProjectManifest, scope: DomainName) {
    const hasScope =
      manifest.scopedRegistries !== undefined &&
      manifest.scopedRegistries.some((registry) =>
        registry.scopes.includes(scope)
      );
    return {
      pass: hasScope,
      message: () =>
        `Expected manifest to have a scoped-registry with scope "${scope}".`,
    };
  },

  toHaveScopedRegistries(manifest: UnityProjectManifest) {
    const hasScopedRegistries = manifest.scopedRegistries !== undefined;
    return {
      pass: hasScopedRegistries,
      message: () => "Expected manifest to have scoped-registries.",
    };
  },
});
