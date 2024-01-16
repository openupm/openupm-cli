import { describe } from "mocha";
import {
  addScope,
  hasScope,
  removeScope,
  scopedRegistry,
} from "../src/types/scoped-registry";
import { exampleRegistryUrl } from "./mock-registry";
import should from "should";
import { domainName } from "../src/types/domain-name";

describe("scoped-registry", function () {
  describe("construction", function () {
    it("should have empty scopes list if scopes are not specified", () => {
      const registry = scopedRegistry("test", exampleRegistryUrl);
      should(registry.scopes).be.empty();
    });
  });
  describe("add scope", function () {
    it("should keep scope-list alphabetical", () => {
      const registry = scopedRegistry("test", exampleRegistryUrl);
      should(addScope(registry, domainName("b"))).be.true();
      should(addScope(registry, domainName("a"))).be.true();
      should(registry.scopes).be.deepEqual(["a", "b"]);
    });
    it("should filter duplicates", () => {
      const registry = scopedRegistry("test", exampleRegistryUrl);
      should(addScope(registry, domainName("a"))).be.true();
      should(addScope(registry, domainName("a"))).be.false();
      should(registry.scopes).be.deepEqual(["a"]);
    });
  });
  describe("has scope", function () {
    it("should have scope that was added", () => {
      const registry = scopedRegistry("test", exampleRegistryUrl);
      addScope(registry, domainName("a"));
      should(hasScope(registry, domainName("a"))).be.true();
    });
    it("should not have scope that was not added", () => {
      const registry = scopedRegistry("test", exampleRegistryUrl);
      should(hasScope(registry, domainName("a"))).be.false();
    });
  });
  describe("remove scope", function () {
    it("should not have scope after removing it", () => {
      const registry = scopedRegistry("test", exampleRegistryUrl, [
        domainName("a"),
      ]);
      should(removeScope(registry, domainName("a"))).be.true();
      should(hasScope(registry, domainName("a"))).be.false();
    });
    it("should not do nothing if scope does not exist", () => {
      const registry = scopedRegistry("test", exampleRegistryUrl, [
        domainName("a"),
      ]);
      should(removeScope(registry, domainName("b"))).be.false();
      should(hasScope(registry, domainName("a"))).be.true();
    });
    it("should remove duplicate scopes", () => {
      const registry = scopedRegistry("test", exampleRegistryUrl, [
        domainName("a"),
        domainName("a"),
      ]);
      should(removeScope(registry, domainName("a"))).be.true();
      should(registry.scopes).be.empty();
    });
  });
});
