import {
  emptyDependencyGraph,
  graphHasNodeAt,
  setGraphNode,
} from "../../src/domain/dependency-graph";
import { makeDomainName } from "../../src/domain/domain-name";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { exampleRegistryUrl } from "./data-registry";
import { PackumentNotFoundError } from "../../src/common-errors";

describe("dependency graph", () => {
  const somePackage = makeDomainName("com.some.package");
  const someVersion = makeSemanticVersion("1.0.0");

  describe("set node", () => {
    it("should add new node", () => {
      const initial = emptyDependencyGraph;
      const node = {
        resolved: true,
        source: exampleRegistryUrl,
        dependencies: {},
      } as const;

      const withNode = setGraphNode(initial, somePackage, someVersion, node);

      expect(withNode).toEqual({ [somePackage]: { [someVersion]: node } });
    });

    it("should overwrite node", () => {
      const initial = setGraphNode(
        emptyDependencyGraph,
        somePackage,
        someVersion,
        {
          resolved: false,
          error: new PackumentNotFoundError(somePackage),
        }
      );
      const node = {
        resolved: true,
        source: exampleRegistryUrl,
        dependencies: {},
      } as const;

      const withNode = setGraphNode(initial, somePackage, someVersion, node);

      expect(withNode).toEqual({ [somePackage]: { [someVersion]: node } });
    });
  });

  describe("has node", () => {
    it("should be false if node was not added", () => {
      const actual = graphHasNodeAt(
        emptyDependencyGraph,
        somePackage,
        someVersion
      );

      expect(actual).toBeFalsy();
    });

    it("should be true if node was added", () => {
      const initial = setGraphNode(
        emptyDependencyGraph,
        somePackage,
        someVersion,
        {
          resolved: false,
          error: new PackumentNotFoundError(somePackage),
        }
      );

      const actual = graphHasNodeAt(initial, somePackage, someVersion);

      expect(actual).toBeTruthy();
    });
  });
});
