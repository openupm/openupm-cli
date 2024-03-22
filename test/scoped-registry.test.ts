import {
  addScope,
  hasScope,
  makeScopedRegistry,
  removeScope,
} from "../src/types/scoped-registry";
import { exampleRegistryUrl } from "./mock-registry";
import { makeDomainName } from "../src/types/domain-name";
import fc from "fast-check";
import { arbDomainName } from "./domain-name.arb";

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
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          let registry = makeScopedRegistry("test", exampleRegistryUrl);

          registry = addScope(registry, packumentName);
          registry = addScope(registry, packumentName);

          expect(registry.scopes).toEqual([packumentName]);
        })
      );
    });
  });

  describe("has scope", () => {
    it("should have scope that was added", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          let registry = makeScopedRegistry("test", exampleRegistryUrl);

          registry = addScope(registry, packumentName);

          expect(hasScope(registry, packumentName)).toBeTruthy();
        })
      );
    });

    it("should not have scope that was not added", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const registry = makeScopedRegistry("test", exampleRegistryUrl);

          expect(hasScope(registry, packumentName)).toBeFalsy();
        })
      );
    });
  });

  describe("remove scope", () => {
    it("should not have scope after removing it", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          let registry = makeScopedRegistry("test", exampleRegistryUrl, [
            packumentName,
          ]);

          registry = removeScope(registry, packumentName);

          expect(hasScope(registry, packumentName)).toBeFalsy();
        })
      );
    });

    it("should not do nothing if scope does not exist", () => {
      let registry = makeScopedRegistry("test", exampleRegistryUrl, [
        makeDomainName("a"),
      ]);

      registry = removeScope(registry, makeDomainName("b"));

      expect(hasScope(registry, makeDomainName("a"))).toBeTruthy();
    });

    it("should remove duplicate scopes", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          let registry = makeScopedRegistry("test", exampleRegistryUrl, [
            packumentName,
            packumentName,
          ]);

          registry = removeScope(registry, packumentName);

          expect(registry.scopes).toHaveLength(0);
        })
      );
    });
  });
});
