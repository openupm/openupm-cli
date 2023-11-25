import { describe } from "mocha";
import {
  addDependency,
  addScopedRegistry,
  addTestable,
  emptyPackageManifest,
  removeDependency,
  tryGetScopedRegistryByUrl,
} from "../src/types/pkg-manifest";
import { domainName } from "../src/types/domain-name";
import { semanticVersion } from "../src/types/semantic-version";
import should from "should";
import { scopedRegistry } from "../src/types/scoped-registry";
import { registryUrl } from "../src/types/registry-url";

describe("pkg-manifest", function () {
  describe("dependency", function () {
    it("should add dependency when adding first time", () => {
      const manifest = emptyPackageManifest();
      addDependency(manifest, domainName("test"), semanticVersion("1.2.3"));
      should(manifest.dependencies).deepEqual({ test: "1.2.3" });
    });
    it("should overwrite dependency when adding second time", () => {
      const manifest = emptyPackageManifest();
      addDependency(manifest, domainName("test"), semanticVersion("1.2.3"));
      addDependency(manifest, domainName("test"), semanticVersion("2.3.4"));
      should(manifest.dependencies).deepEqual({ test: "2.3.4" });
    });
    it("should remove existing dependency", () => {
      const manifest = emptyPackageManifest();
      addDependency(manifest, domainName("test"), semanticVersion("1.2.3"));
      removeDependency(manifest, domainName("test"));
      should(manifest.dependencies).deepEqual({});
    });
    it("should do nothing when dependency does not exist", () => {
      const manifest = emptyPackageManifest();
      removeDependency(manifest, domainName("test"));
      should(manifest.dependencies).deepEqual({});
    });
  });
  describe("scoped-registry", function () {
    it("should should find scoped-registry with url if present", () => {
      const manifest = emptyPackageManifest();
      const url = registryUrl("https://test.com");
      const expected = scopedRegistry("test", url);
      addScopedRegistry(manifest, expected);
      should(tryGetScopedRegistryByUrl(manifest, url)).be.deepEqual(expected);
    });
    it("should should not find scoped-registry with incorrect url", () => {
      const manifest = emptyPackageManifest();
      const url = registryUrl("https://test.com");
      const expected = scopedRegistry("test", registryUrl("https://test2.com"));
      addScopedRegistry(manifest, expected);
      should(tryGetScopedRegistryByUrl(manifest, url)).be.null();
    });
  });
  describe("testables", function () {
    it("should not add testables which already exist", () => {
      const manifest = emptyPackageManifest();
      addTestable(manifest, domainName("a"));
      addTestable(manifest, domainName("a"));
      should(manifest.testables).deepEqual(["a"]);
    });
    it("should add testables in alphabetical order", () => {
      const manifest = emptyPackageManifest();
      addTestable(manifest, domainName("b"));
      addTestable(manifest, domainName("a"));
      should(manifest.testables).deepEqual(["a", "b"]);
    });
  });
});
