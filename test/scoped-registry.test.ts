import {
  addScope,
  hasScope,
  makeScopedRegistry,
  removeScope,
} from "../src/types/scoped-registry";
import { exampleRegistryUrl } from "./mock-registry";
import { makeDomainName } from "../src/types/domain-name";

describe("scoped-registry", () => {
  describe("construction", () => {
    it("should have empty scopes list if scopes are not specified", () => {
      const registry = makeScopedRegistry("test", exampleRegistryUrl);
      expect(registry.scopes).toHaveLength(0);
    });
  });
  describe("add scope", () => {
    it("should keep scope-list alphabetical", () => {
      let registry = makeScopedRegistry("test", exampleRegistryUrl);

      registry = addScope(registry, makeDomainName("b"));
      registry = addScope(registry, makeDomainName("a"));

      expect(registry.scopes).toEqual(["a", "b"]);
    });

    it("should filter duplicates", () => {
      let registry = makeScopedRegistry("test", exampleRegistryUrl);

      registry = addScope(registry, makeDomainName("a"));
      registry = addScope(registry, makeDomainName("a"));

      expect(registry.scopes).toEqual(["a"]);
    });
  });
  describe("has scope", () => {
    it("should have scope that was added", () => {
      let registry = makeScopedRegistry("test", exampleRegistryUrl);

      registry = addScope(registry, makeDomainName("a"));

      expect(hasScope(registry, makeDomainName("a"))).toBeTruthy();
    });
    it("should not have scope that was not added", () => {
      const registry = makeScopedRegistry("test", exampleRegistryUrl);

      expect(hasScope(registry, makeDomainName("a"))).toBeFalsy();
    });
  });
  describe("remove scope", () => {
    it("should not have scope after removing it", () => {
      let registry = makeScopedRegistry("test", exampleRegistryUrl, [
        makeDomainName("a"),
      ]);

      registry = removeScope(registry, makeDomainName("a"));

      expect(hasScope(registry, makeDomainName("a"))).toBeFalsy();
    });
    it("should not do nothing if scope does not exist", () => {
      let registry = makeScopedRegistry("test", exampleRegistryUrl, [
        makeDomainName("a"),
      ]);

      registry = removeScope(registry, makeDomainName("b"));

      expect(hasScope(registry, makeDomainName("a"))).toBeTruthy();
    });
    it("should remove duplicate scopes", () => {
      let registry = makeScopedRegistry("test", exampleRegistryUrl, [
        makeDomainName("a"),
        makeDomainName("a"),
      ]);

      registry = removeScope(registry, makeDomainName("a"));

      expect(registry.scopes).toHaveLength(0);
    });
  });
});
