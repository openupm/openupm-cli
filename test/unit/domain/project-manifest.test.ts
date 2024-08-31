import {
  addTestable,
  emptyProjectManifest,
  hasDependency,
  mapScopedRegistry,
  removeDependency,
  setDependency,
  setScopedRegistry,
  tryGetScopedRegistryByUrl,
} from "../../../src/domain/project-manifest";
import { DomainName } from "../../../src/domain/domain-name";
import { SemanticVersion } from "../../../src/domain/semantic-version";
import { addScope, makeScopedRegistry } from "../../../src/domain/scoped-registry";
import fc from "fast-check";
import { arbDomainName } from "./domain-name.arb";
import { exampleRegistryUrl } from "./data-registry";
import { buildProjectManifest } from "./data-project-manifest";
import { RegistryUrl } from "../../../src/domain/registry-url";

describe("project-manifest", () => {
  describe("set dependency", () => {
    it("should add dependency when adding first time", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          let manifest = emptyProjectManifest;

          manifest = setDependency(
            manifest,
            packumentName,
            SemanticVersion.parse("1.2.3")
          );

          expect(manifest.dependencies).toEqual({ [packumentName]: "1.2.3" });
        })
      );
    });

    it("should overwrite dependency when adding second time", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          let manifest = emptyProjectManifest;

          manifest = setDependency(
            manifest,
            packumentName,
            SemanticVersion.parse("1.2.3")
          );
          manifest = setDependency(
            manifest,
            packumentName,
            SemanticVersion.parse("2.3.4")
          );

          expect(manifest.dependencies).toEqual({ [packumentName]: "2.3.4" });
        })
      );
    });
  });

  describe("remove dependency", () => {
    it("should remove existing dependency", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          let manifest = emptyProjectManifest;

          manifest = setDependency(
            manifest,
            packumentName,
            SemanticVersion.parse("1.2.3")
          );
          manifest = removeDependency(manifest, packumentName);

          expect(manifest.dependencies).toEqual({});
        })
      );
    });

    it("should do nothing when dependency does not exist", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          let manifest = emptyProjectManifest;

          manifest = removeDependency(manifest, packumentName);

          expect(manifest.dependencies).toEqual({});
        })
      );
    });
  });

  describe("get scoped-registry", () => {
    it("should should find scoped-registry with url if present", () => {
      let manifest = emptyProjectManifest;
      const url = RegistryUrl.parse("https://test.com");
      const expected = makeScopedRegistry("test", url);

      manifest = setScopedRegistry(manifest, expected);

      expect(tryGetScopedRegistryByUrl(manifest, url)).toEqual(expected);
    });

    it("should should not find scoped-registry with incorrect url", () => {
      let manifest = emptyProjectManifest;
      const url = RegistryUrl.parse("https://test.com");
      const expected = makeScopedRegistry(
        "test",
        RegistryUrl.parse("https://test2.com")
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
      const expected = addScope(initial, DomainName.parse("wow"));
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
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          let manifest = emptyProjectManifest;

          manifest = addTestable(manifest, packumentName);
          manifest = addTestable(manifest, packumentName);

          expect(manifest.testables).toEqual([packumentName]);
        })
      );
    });

    it("should add testables in alphabetical order", () => {
      let manifest = emptyProjectManifest;

      manifest = addTestable(manifest, DomainName.parse("b"));
      manifest = addTestable(manifest, DomainName.parse("a"));

      expect(manifest.testables).toEqual(["a", "b"]);
    });
  });

  describe("has dependency", () => {
    it("should be true if manifest has dependency", () => {
      const packageName = DomainName.parse("com.some.package");
      const manifest = buildProjectManifest((manifest) =>
        manifest.addDependency(packageName, "1.0.0", true, true)
      );

      expect(hasDependency(manifest, packageName)).toBeTruthy();
    });

    it("should be false if manifest does not have dependency", () => {
      const packageName = DomainName.parse("com.some.package");

      expect(hasDependency(emptyProjectManifest, packageName)).toBeFalsy();
    });
  });
});
