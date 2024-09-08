import fc from "fast-check";
import path from "path";
import { DomainName } from "../../../src/domain/domain-name";
import {
  addTestable,
  emptyProjectManifest,
  hasDependency,
  manifestPathFor,
  mapScopedRegistry,
  parseProjectManifest,
  removeDependency,
  removeEmptyScopedRegistries,
  removeScopeFromAllScopedRegistries,
  removeTestable,
  serializeProjectManifest,
  setDependency,
  setScopedRegistry,
  tryGetScopedRegistryByUrl,
  type UnityProjectManifest,
} from "../../../src/domain/project-manifest";
import { RegistryUrl } from "../../../src/domain/registry-url";
import {
  addScope,
  makeScopedRegistry,
} from "../../../src/domain/scoped-registry";
import { SemanticVersion } from "../../../src/domain/semantic-version";
import { buildProjectManifest } from "../../common/data-project-manifest";
import { exampleRegistryUrl } from "../../common/data-registry";
import { arbDomainName } from "./domain-name.arb";

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

  describe("remove scope from all scoped registries", () => {
    it('should have no effect for undefined "scopedRegistries"', () => {
      fc.assert(
        fc.property(arbDomainName, (scope) => {
          const original: UnityProjectManifest = { dependencies: {} };

          const actual = removeScopeFromAllScopedRegistries(original, scope);

          expect(actual).toEqual(original);
        })
      );
    });

    it("should remove scope from all scoped registries", () => {
      fc.assert(
        fc.property(arbDomainName, arbDomainName, (scope1, scope2) => {
          const original: UnityProjectManifest = {
            dependencies: {},
            scopedRegistries: [
              {
                name: "Scope A",
                url: RegistryUrl.parse("https://a.com"),
                scopes: [scope1],
              },
              {
                name: "Scope B",
                url: RegistryUrl.parse("https://b.com"),
                scopes: [scope1, scope2],
              },
            ],
          };

          const actual = removeScopeFromAllScopedRegistries(original, scope1);

          expect(actual).toEqual<UnityProjectManifest>({
            dependencies: {},
            scopedRegistries: [
              {
                name: "Scope A",
                url: RegistryUrl.parse("https://a.com"),
                scopes: [],
              },
              {
                name: "Scope B",
                url: RegistryUrl.parse("https://b.com"),
                scopes: [scope2],
              },
            ],
          });
        })
      );
    });
  });

  describe("remove empty scoped registries", () => {
    it('should have no effect for undefined "scopedRegistries"', () => {
      const original: UnityProjectManifest = { dependencies: {} };

      const actual = removeEmptyScopedRegistries(original);

      expect(actual).toEqual(original);
    });

    it("should leave non-empty scoped registries", () => {
      fc.assert(
        fc.property(arbDomainName, (scope) => {
          const original: UnityProjectManifest = {
            dependencies: {},
            scopedRegistries: [
              {
                name: "Scope A",
                url: RegistryUrl.parse("https://a.com"),
                scopes: [scope],
              },
            ],
          };

          const actual = removeEmptyScopedRegistries(original);

          expect(actual).toEqual<UnityProjectManifest>(original);
        })
      );
    });

    it("should remove empty scoped registries", () => {
      const original: UnityProjectManifest = {
        dependencies: {},
        scopedRegistries: [
          {
            name: "Scope A",
            url: RegistryUrl.parse("https://a.com"),
            scopes: [],
          },
        ],
      };

      const actual = removeEmptyScopedRegistries(original);

      expect(actual).toEqual<UnityProjectManifest>({
        dependencies: {},
        scopedRegistries: [],
      });
    });
  });

  describe("remove testable", () => {
    it('should have no effect for undefined "testables"', () => {
      fc.assert(
        fc.property(arbDomainName, (packageName) => {
          const original: UnityProjectManifest = { dependencies: {} };

          const actual = removeTestable(original, packageName);

          expect(actual).toEqual(original);
        })
      );
    });

    it("should remove testable", () => {
      fc.assert(
        fc.property(arbDomainName, (packageName) => {
          const original: UnityProjectManifest = {
            dependencies: {},
            testables: [packageName],
          };

          const actual = removeTestable(original, packageName);

          expect(actual).toEqual<UnityProjectManifest>({
            dependencies: {},
            testables: [],
          });
        })
      );
    });
  });

  describe("path", () => {
    it("should determine correct manifest path", () => {
      const manifestPath = manifestPathFor("test-openupm-cli");
      const expected = path.join(
        "test-openupm-cli",
        "Packages",
        "manifest.json"
      );
      expect(manifestPath).toEqual(expected);
    });
  });

  describe("parse", () => {
    it("should parse valid manifest", () => {
      const content = `{ "dependencies": { "com.package.a": "1.0.0"} }`;

      const parsed = parseProjectManifest(content);

      expect(parsed).toEqual({
        dependencies: {
          "com.package.a": "1.0.0",
        },
      });
    });

    it("should fail for bad json", () => {
      const content = "not : valid // json";

      expect(() => parseProjectManifest(content)).toThrow(Error);
    });

    it("should fail incorrect json shape", () => {
      // Valid json but not what we want
      const content = `123`;

      expect(() => parseProjectManifest(content)).toThrow(Error);
    });
  });

  describe("serialize manifest", () => {
    it("should prune empty scoped registries", () => {
      const manifest: UnityProjectManifest = {
        dependencies: {},
        scopedRegistries: [
          // Scoped registry with no scopes
          { name: "some registry", url: exampleRegistryUrl, scopes: [] },
        ],
      };

      const json = serializeProjectManifest(manifest);

      // The registry should not be in the output json
      expect(json).not.toContain("some registry");
    });
  });
});
