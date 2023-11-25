import { PkgManifest } from "../src/types/global";
import { loadManifest } from "../src/utils/manifest";
import should from "should";
import { DomainName } from "../src/types/domain-name";
import { SemanticVersion } from "../src/types/semantic-version";
import { PackageUrl } from "../src/types/package-url";
import { hasScope } from "../src/types/scoped-registry";

export function shouldHaveManifest(): PkgManifest {
  const manifest = loadManifest();
  should(manifest).not.be.null();
  return manifest!;
}

export function shouldHaveNoManifest() {
  const manifest = loadManifest();
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
