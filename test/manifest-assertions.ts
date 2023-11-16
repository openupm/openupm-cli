import { PkgManifest, PkgName, PkgVersion } from "../src/types/global";
import { loadManifest } from "../src/utils/manifest";
import should from "should";

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
  name: PkgName,
  version: PkgVersion
) {
  should(manifest.dependencies[name]).equal(version);
}

export function shouldNotHaveAnyDependencies(manifest: PkgManifest) {
  should(manifest.dependencies).be.empty();
}
export function shouldNotHaveDependency(manifest: PkgManifest, name: PkgName) {
  should(manifest.dependencies[name]).be.undefined();
}

export function shouldHaveRegistryWithScopes(
  manifest: PkgManifest,
  scopes: PkgName[]
) {
  should(manifest.scopedRegistries).not.be.undefined();
  manifest
    .scopedRegistries!.some((registry) =>
      scopes.every((scope) => registry.scopes.includes(scope))
    )
    .should.be.true("At least one scope was missing");
}
