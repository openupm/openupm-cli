import { loadManifest } from "../src/utils/pkg-manifest-io";
import should from "should";
import { DomainName } from "../src/types/domain-name";
import { SemanticVersion } from "../src/types/semantic-version";
import { PackageUrl } from "../src/types/package-url";
import { hasScope } from "../src/types/scoped-registry";
import { PkgManifest } from "../src/types/pkg-manifest";

export function shouldHaveManifestAt(manifestPath: string): PkgManifest {
  const manifest = loadManifest(manifestPath);
  should(manifest).not.be.null();
  return manifest!;
}

export function shouldHaveNoManifestAt(manifestPath: string) {
  const manifest = loadManifest(manifestPath);
  should(manifest).be.null();
}

export function shouldHaveDependency(
  manifest: PkgManifest,
  name: DomainName,
  version: SemanticVersion | PackageUrl
) {
  should(manifest.dependencies[name]).equal(version);
}

export function shouldNotHaveAnyDependencies(manifest: PkgManifest) {
  should(manifest.dependencies).be.empty();
}

export function shouldNotHaveDependency(
  manifest: PkgManifest,
  name: DomainName
) {
  should(manifest.dependencies[name]).be.undefined();
}

export function shouldHaveRegistryWithScopes(
  manifest: PkgManifest,
  scopes: DomainName[]
) {
  should(manifest.scopedRegistries).not.be.undefined();
  manifest
    .scopedRegistries!.some((registry) =>
      scopes.every((scope) => hasScope(registry, scope))
    )
    .should.be.true("At least one scope was missing");
}
