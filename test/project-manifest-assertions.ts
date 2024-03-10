import { DomainName } from "../src/types/domain-name";
import { SemanticVersion } from "../src/types/semantic-version";
import { PackageUrl } from "../src/types/package-url";
import { hasScope } from "../src/types/scoped-registry";
import { UnityProjectManifest } from "../src/types/project-manifest";

export function shouldHaveDependency(
  manifest: UnityProjectManifest,
  name: DomainName,
  version: SemanticVersion | PackageUrl
) {
  expect(manifest.dependencies[name]).toEqual(version);
}

export function shouldNotHaveAnyDependencies(manifest: UnityProjectManifest) {
  expect(manifest.dependencies).toEqual({});
}

export function shouldNotHaveDependency(
  manifest: UnityProjectManifest,
  name: DomainName
) {
  expect(manifest.dependencies[name]).toBeUndefined();
}

export function shouldHaveRegistryWithScopes(
  manifest: UnityProjectManifest,
  scopes: DomainName[]
) {
  expect(manifest.scopedRegistries).not.toBeUndefined();
  expect(
    manifest.scopedRegistries!.some((registry) =>
      scopes.every((scope) => hasScope(registry, scope))
    )
  ).toBeTruthy();
}

export function shouldNotHaveRegistries(manifest: UnityProjectManifest) {
  expect(manifest.scopedRegistries).toBeUndefined();
}
