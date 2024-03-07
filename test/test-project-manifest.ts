import { describe } from "mocha";
import {
  addDependency,
  addScopedRegistry,
  addTestable,
  emptyProjectManifest,
  removeDependency,
  tryGetScopedRegistryByUrl,
} from "../src/types/project-manifest";
import { domainName } from "../src/types/domain-name";
import { semanticVersion } from "../src/types/semantic-version";
import should from "should";
import { scopedRegistry } from "../src/types/scoped-registry";
import { registryUrl } from "../src/types/registry-url";

describe("project-manifest", function () {
  describe("dependency", function () {
    it("should add dependency when adding first time", () => {
      let manifest = emptyProjectManifest;

      manifest = addDependency(
        manifest,
        domainName("test"),
        semanticVersion("1.2.3")
      );

      should(manifest.dependencies).deepEqual({ test: "1.2.3" });
    });
    it("should overwrite dependency when adding second time", () => {
      let manifest = emptyProjectManifest;

      manifest = addDependency(
        manifest,
        domainName("test"),
        semanticVersion("1.2.3")
      );
      manifest = addDependency(
        manifest,
        domainName("test"),
        semanticVersion("2.3.4")
      );

      should(manifest.dependencies).deepEqual({ test: "2.3.4" });
    });
    it("should remove existing dependency", () => {
      let manifest = emptyProjectManifest;

      manifest = addDependency(
        manifest,
        domainName("test"),
        semanticVersion("1.2.3")
      );
      manifest = removeDependency(manifest, domainName("test"));

      should(manifest.dependencies).deepEqual({});
    });
    it("should do nothing when dependency does not exist", () => {
      let manifest = emptyProjectManifest;

      manifest = removeDependency(manifest, domainName("test"));

      should(manifest.dependencies).deepEqual({});
    });
  });
  describe("scoped-registry", function () {
    it("should should find scoped-registry with url if present", () => {
      let manifest = emptyProjectManifest;
      const url = registryUrl("https://test.com");
      const expected = scopedRegistry("test", url);

      manifest = addScopedRegistry(manifest, expected);

      should(tryGetScopedRegistryByUrl(manifest, url)).be.deepEqual(expected);
    });
    it("should should not find scoped-registry with incorrect url", () => {
      let manifest = emptyProjectManifest;
      const url = registryUrl("https://test.com");
      const expected = scopedRegistry("test", registryUrl("https://test2.com"));

      manifest = addScopedRegistry(manifest, expected);

      should(tryGetScopedRegistryByUrl(manifest, url)).be.null();
    });
  });
  describe("testables", function () {
    it("should not add testables which already exist", () => {
      let manifest = emptyProjectManifest;

      manifest = addTestable(manifest, domainName("a"));
      manifest = addTestable(manifest, domainName("a"));

      should(manifest.testables).deepEqual(["a"]);
    });
    it("should add testables in alphabetical order", () => {
      let manifest = emptyProjectManifest;

      manifest = addTestable(manifest, domainName("b"));
      manifest = addTestable(manifest, domainName("a"));

      should(manifest.testables).deepEqual(["a", "b"]);
    });
  });
});
