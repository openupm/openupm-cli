import {
  addScope,
  hasScope,
  removeScope,
  scopedRegistry,
} from "../src/types/scoped-registry";
import { exampleRegistryUrl } from "./mock-registry";
import { makeDomainName } from "../src/types/domain-name";

describe("scoped-registry", function () {
  describe("construction", function () {
    it("should have empty scopes list if scopes are not specified", () => {
      const registry = scopedRegistry("test", exampleRegistryUrl);
      expect(registry.scopes).toHaveLength(0);
    });
  });
  describe("add scope", function () {
    it("should keep scope-list alphabetical", () => {
      const registry = scopedRegistry("test", exampleRegistryUrl);
      expect(addScope(registry, makeDomainName("b"))).toBeTruthy();
      expect(addScope(registry, makeDomainName("a"))).toBeTruthy();
      expect(registry.scopes).toEqual(["a", "b"]);
    });
    it("should filter duplicates", () => {
      const registry = scopedRegistry("test", exampleRegistryUrl);
      expect(addScope(registry, makeDomainName("a"))).toBeTruthy();
      expect(addScope(registry, makeDomainName("a"))).toBeFalsy();
      expect(registry.scopes).toEqual(["a"]);
    });
  });
  describe("has scope", function () {
    it("should have scope that was added", () => {
      const registry = scopedRegistry("test", exampleRegistryUrl);
      addScope(registry, makeDomainName("a"));
      expect(hasScope(registry, makeDomainName("a"))).toBeTruthy();
    });
    it("should not have scope that was not added", () => {
      const registry = scopedRegistry("test", exampleRegistryUrl);
      expect(hasScope(registry, makeDomainName("a"))).toBeFalsy();
    });
  });
  describe("remove scope", function () {
    it("should not have scope after removing it", () => {
      const registry = scopedRegistry("test", exampleRegistryUrl, [
        makeDomainName("a"),
      ]);
      expect(removeScope(registry, makeDomainName("a"))).toBeTruthy();
      expect(hasScope(registry, makeDomainName("a"))).toBeFalsy();
    });
    it("should not do nothing if scope does not exist", () => {
      const registry = scopedRegistry("test", exampleRegistryUrl, [
        makeDomainName("a"),
      ]);
      expect(removeScope(registry, makeDomainName("b"))).toBeFalsy();
      expect(hasScope(registry, makeDomainName("a"))).toBeTruthy();
    });
    it("should remove duplicate scopes", () => {
      const registry = scopedRegistry("test", exampleRegistryUrl, [
        makeDomainName("a"),
        makeDomainName("a"),
      ]);
      expect(removeScope(registry, makeDomainName("a"))).toBeTruthy();
      expect(registry.scopes).toHaveLength(0);
    });
  });
});
