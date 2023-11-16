import { PkgManifest, PkgName, PkgVersion } from "../src/types/global";
import { loadManifest } from "../src/utils/manifest";
import "should";
import should from "should";

function requireManifest(): PkgManifest {
  const manifest = loadManifest();
  (manifest !== null).should.be.ok();
  return manifest!;
}

export function shouldHaveManifestMatching(
  expected: PkgManifest
): should.Assertion {
  const manifest = requireManifest();
  return manifest.should.be.deepEqual(expected);
}

export function shouldHaveManifestWithDependency(
  name: PkgName,
  version: PkgVersion
): should.Assertion {
  const manifest = requireManifest();
  return should(manifest.dependencies[name]).equal(version);
}
