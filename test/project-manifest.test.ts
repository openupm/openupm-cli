import {
  addDependency,
  setScopedRegistry,
  addTestable,
  emptyProjectManifest,
  mapScopedRegistry,
  removeDependency,
  tryGetScopedRegistryByUrl,
} from "../src/types/project-manifest";
import { makeDomainName } from "../src/types/domain-name";
import { makeSemanticVersion } from "../src/types/semantic-version";
import { addScope, makeScopedRegistry } from "../src/types/scoped-registry";
import { makeRegistryUrl } from "../src/types/registry-url";
import { exampleRegistryUrl } from "./mock-registry";

describe("project-manifest", () => {
  describe("dependency", () => {
    it("should add dependency when adding first time", () => {
      let manifest = emptyProjectManifest;

      manifest = addDependency(
        manifest,
        makeDomainName("test"),
        makeSemanticVersion("1.2.3")
      );

      expect(manifest.dependencies).toEqual({ test: "1.2.3" });
    });
    it("should overwrite dependency when adding second time", () => {
      let manifest = emptyProjectManifest;

      manifest = addDependency(
        manifest,
        makeDomainName("test"),
        makeSemanticVersion("1.2.3")
      );
      manifest = addDependency(
        manifest,
        makeDomainName("test"),
        makeSemanticVersion("2.3.4")
      );

      expect(manifest.dependencies).toEqual({ test: "2.3.4" });
    });
    it("should remove existing dependency", () => {
      let manifest = emptyProjectManifest;

      manifest = addDependency(
        manifest,
        makeDomainName("test"),
        makeSemanticVersion("1.2.3")
      );
      manifest = removeDependency(manifest, makeDomainName("test"));

      expect(manifest.dependencies).toEqual({});
    });
    it("should do nothing when dependency does not exist", () => {
      let manifest = emptyProjectManifest;

      manifest = removeDependency(manifest, makeDomainName("test"));

      expect(manifest.dependencies).toEqual({});
    });
  });
  describe("get scoped-registry", () => {
    it("should should find scoped-registry with url if present", () => {
      let manifest = emptyProjectManifest;
      const url = makeRegistryUrl("https://test.com");
      const expected = makeScopedRegistry("test", url);

      manifest = setScopedRegistry(manifest, expected);

      expect(tryGetScopedRegistryByUrl(manifest, url)).toEqual(expected);
    });
    it("should should not find scoped-registry with incorrect url", () => {
      let manifest = emptyProjectManifest;
      const url = makeRegistryUrl("https://test.com");
      const expected = makeScopedRegistry(
        "test",
        makeRegistryUrl("https://test2.com")
      );

      manifest = setScopedRegistry(manifest, expected);

      expect(tryGetScopedRegistryByUrl(manifest, url)).toBeNull();
    });
  });
  describe("map scoped-registry", () => {
    it("should have null as mapping input if manifest does not have scoped-registry", () => {
      const manifest = emptyProjectManifest;

      expect.assertions(1);
      mapScopedRegistry(manifest, exampleRegistryUrl, (registry) => {
        expect(registry).toBeNull();
        return registry;
      });
    });

    it("should have scoped-registry as input if found", () => {
      let manifest = emptyProjectManifest;
      const expected = makeScopedRegistry("test", exampleRegistryUrl);
      manifest = setScopedRegistry(manifest, expected);

      expect.assertions(1);
      mapScopedRegistry(manifest, exampleRegistryUrl, (registry) => {
        expect(registry).toEqual(expected);
        return registry;
      });
    });

    it("should not have scoped-registry after returning null", () => {
      let manifest = emptyProjectManifest;
      const initial = makeScopedRegistry("test", exampleRegistryUrl);
      manifest = setScopedRegistry(manifest, initial);

      manifest = mapScopedRegistry(manifest, exampleRegistryUrl, () => null);

      const actual = tryGetScopedRegistryByUrl(manifest, exampleRegistryUrl);
      expect(actual).toBeNull();
    });

    it("should not updated scoped-registry after returning it", () => {
      let manifest = emptyProjectManifest;
      const initial = makeScopedRegistry("test", exampleRegistryUrl);
      const expected = addScope(initial, makeDomainName("wow"));
      manifest = setScopedRegistry(manifest, initial);

      manifest = mapScopedRegistry(
        manifest,
        exampleRegistryUrl,
        () => expected
      );

      const actual = tryGetScopedRegistryByUrl(manifest, exampleRegistryUrl);
      expect(actual).toEqual(expected);
    });
  });
  describe("testables", () => {
    it("should not add testables which already exist", () => {
      let manifest = emptyProjectManifest;

      manifest = addTestable(manifest, makeDomainName("a"));
      manifest = addTestable(manifest, makeDomainName("a"));

      expect(manifest.testables).toEqual(["a"]);
    });
    it("should add testables in alphabetical order", () => {
      let manifest = emptyProjectManifest;

      manifest = addTestable(manifest, makeDomainName("b"));
      manifest = addTestable(manifest, makeDomainName("a"));

      expect(manifest.testables).toEqual(["a", "b"]);
    });
  });
});
