import {
  addScope,
  hasScope,
  removeScope,
  scopedRegistry,
} from "../src/types/scoped-registry";
import { exampleRegistryUrl } from "./mock-registry";
import { domainName } from "../src/types/domain-name";

describe("scoped-registry", function () {
  describe("construction", function () {
    it("should have empty scopes list if scopes are not specified", () => {
      const registry = scopedRegistry("test", exampleRegistryUrl);
      expect(registry.scopes).toHaveLength(0);
    });
  });
  describe("add scope", function () {
    it("should keep scope-list alphabetical", () => {
      let registry = scopedRegistry("test", exampleRegistryUrl);

      registry = addScope(registry, domainName("b"));
      registry = addScope(registry, domainName("a"));

      expect(registry.scopes).toEqual(["a", "b"]);
    });
    it("should filter duplicates", () => {
      let registry = scopedRegistry("test", exampleRegistryUrl);

      registry = addScope(registry, domainName("a"));
      registry = addScope(registry, domainName("a"));

      expect(registry.scopes).toEqual(["a"]);
    });
  });
  describe("has scope", function () {
    it("should have scope that was added", () => {
      let registry = scopedRegistry("test", exampleRegistryUrl);

      registry = addScope(registry, domainName("a"));

      expect(hasScope(registry, domainName("a"))).toBeTruthy();
    });
    it("should not have scope that was not added", () => {
      const registry = scopedRegistry("test", exampleRegistryUrl);

      expect(hasScope(registry, domainName("a"))).toBeFalsy();
    });
  });
  describe("remove scope", function () {
    it("should not have scope after removing it", () => {
      let registry = scopedRegistry("test", exampleRegistryUrl, [
        domainName("a"),
      ]);

      registry = removeScope(registry, domainName("a"));

      expect(hasScope(registry, domainName("a"))).toBeFalsy();
    });
    it("should not do nothing if scope does not exist", () => {
      let registry = scopedRegistry("test", exampleRegistryUrl, [
        domainName("a"),
      ]);

      registry = removeScope(registry, domainName("b"));

      expect(hasScope(registry, domainName("a"))).toBeTruthy();
    });
    it("should remove duplicate scopes", () => {
      let registry = scopedRegistry("test", exampleRegistryUrl, [
        domainName("a"),
        domainName("a"),
      ]);

      registry = removeScope(registry, domainName("a"));

      expect(registry.scopes).toHaveLength(0);
    });
  });
});
