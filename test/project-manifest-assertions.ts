import { loadProjectManifest } from "../src/utils/project-manifest-io";
import should from "should";
import { DomainName } from "../src/types/domain-name";
import { SemanticVersion } from "../src/types/semantic-version";
import { PackageUrl } from "../src/types/package-url";
import { hasScope } from "../src/types/scoped-registry";
import { UnityProjectManifest } from "../src/types/project-manifest";

export async function shouldHaveProjectManifest(
  workingDirectory: string
): Promise<UnityProjectManifest> {
  const manifest = await loadProjectManifest(workingDirectory);
  should(manifest).not.be.null();
  return manifest!;
}

export async function shouldHaveNoProjectManifest(workingDirectory: string) {
  const manifest = await loadProjectManifest(workingDirectory);
  should(manifest).be.null();
}

export function shouldHaveDependency(
  manifest: UnityProjectManifest,
  name: DomainName,
  version: SemanticVersion | PackageUrl
) {
  should(manifest.dependencies[name]).equal(version);
}

export function shouldNotHaveAnyDependencies(manifest: UnityProjectManifest) {
  should(manifest.dependencies).be.empty();
}

export function shouldNotHaveDependency(
  manifest: UnityProjectManifest,
  name: DomainName
) {
  should(manifest.dependencies[name]).be.undefined();
}

export function shouldHaveRegistryWithScopes(
  manifest: UnityProjectManifest,
  scopes: DomainName[]
) {
  should(manifest.scopedRegistries).not.be.undefined();
  manifest
    .scopedRegistries!.some((registry) =>
      scopes.every((scope) => hasScope(registry, scope))
    )
    .should.be.true("At least one scope was missing");
}
