import { PkgManifest, PkgName, PkgVersion } from "../src/types/global";
import { loadManifest } from "../src/utils/manifest";
import should from "should";

export function shouldHaveManifest(): PkgManifest {
  const manifest = loadManifest();
  should(manifest).not.be.null();
  return manifest!;
}

export function shouldHaveDependency(
  manifest: PkgManifest,
  name: PkgName,
  version: PkgVersion
): should.Assertion {
  return should(manifest.dependencies[name]).equal(version);
}
