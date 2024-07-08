import {
  emptyDependencyGraph,
  flattenDependencyGraph,
  graphHasNodeAt,
  setGraphNode,
} from "../../src/domain/dependency-graph";
import { makeDomainName } from "../../src/domain/domain-name";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { exampleRegistryUrl } from "./data-registry";
import { PackumentNotFoundError } from "../../src/common-errors";

describe("dependency graph", () => {
  // TODO: Maybe add some property-based tests

  const somePackage = makeDomainName("com.some.package");
  const otherPackage = makeDomainName("com.other.package");
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

  describe("flatten", () => {
    it("should flatten down correctly", () => {
      const someNode = {
        resolved: true,
        source: exampleRegistryUrl,
        dependencies: { [otherPackage]: someVersion },
      } as const;
      const otherNode = {
        resolved: false,
        error: new PackumentNotFoundError(otherPackage),
      } as const;

      let graph = emptyDependencyGraph;
      graph = setGraphNode(graph, somePackage, someVersion, someNode);
      graph = setGraphNode(graph, otherPackage, someVersion, otherNode);

      const actual = flattenDependencyGraph(graph);

      expect(actual).toEqual([
        [somePackage, someVersion, someNode],
        [otherPackage, someVersion, otherNode],
      ]);
    });
  });
});
