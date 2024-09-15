import { DomainName } from "../../../src/domain/domain-name";
import { SemanticVersion } from "../../../src/domain/semantic-version";
import {
  graphNodeCount,
  makeGraphFromSeed,
  markBuiltInResolved,
  markFailed,
  markRemoteResolved,
  NodeType,
  traverseDependencyGraph,
  tryGetGraphNode,
  tryGetNextUnresolved,
} from "../../../src/domain/dependency-graph";
import { someRegistryUrl } from "../../common/data-registry";
import { PackumentNotFoundError } from "../../../src/domain/common-errors";

describe("dependency graph", () => {
  const somePackage = DomainName.parse("com.some.package");
  const otherPackage = DomainName.parse("com.other.package");
  const anotherPackage = DomainName.parse("com.another.package");
  const someVersion = SemanticVersion.parse("1.0.0");

  describe("traverse", () => {
    it("should output all nodes", () => {
      let graph = makeGraphFromSeed(somePackage, someVersion);
      graph = markRemoteResolved(
        graph,
        somePackage,
        someVersion,
        someRegistryUrl,
        { [otherPackage]: someVersion, [anotherPackage]: someVersion }
      );

      const entries = [...traverseDependencyGraph(graph)];

      expect(entries).toEqual(
        expect.arrayContaining([
          [
            somePackage,
            someVersion,
            expect.objectContaining({ type: NodeType.Resolved }),
          ],
          [otherPackage, someVersion, { type: NodeType.Unresolved }],
          [anotherPackage, someVersion, { type: NodeType.Unresolved }],
        ])
      );
    });
  });

  describe("make from seed", () => {
    it("should have unresolved initial node", () => {
      const graph = makeGraphFromSeed(somePackage, someVersion);

      const node = tryGetGraphNode(graph, somePackage, someVersion);
      expect(node).toEqual({ type: NodeType.Unresolved });
    });

    it("should have 1 node", () => {
      const graph = makeGraphFromSeed(somePackage, someVersion);

      const nodeCount = graphNodeCount(graph);
      expect(nodeCount).toEqual(1);
    });
  });

  describe("get unresolved", () => {
    it("should get unresolved node", () => {
      let graph = makeGraphFromSeed(somePackage, someVersion);
      graph = markRemoteResolved(
        graph,
        somePackage,
        someVersion,
        someRegistryUrl,
        { [otherPackage]: someVersion }
      );

      const unresolved = tryGetNextUnresolved(graph);
      expect(unresolved).toEqual([otherPackage, someVersion]);
    });

    it("should get null if all are resolved", () => {
      let graph = makeGraphFromSeed(somePackage, someVersion);
      graph = markBuiltInResolved(graph, somePackage, someVersion);

      const unresolved = tryGetNextUnresolved(graph);
      expect(unresolved).toEqual(null);
    });
  });

  describe("mark built-in resolved", () => {
    it("should mark the given package as resolved", () => {
      let graph = makeGraphFromSeed(somePackage, someVersion);

      graph = markBuiltInResolved(graph, somePackage, someVersion);

      const node = tryGetGraphNode(graph, somePackage, someVersion);
      expect(node).toEqual({
        type: NodeType.Resolved,
        source: "built-in",
        dependencies: {},
      });
    });
  });

  describe("mark remote resolved", () => {
    it("should mark the given package as resolved", () => {
      let graph = makeGraphFromSeed(somePackage, someVersion);

      graph = markRemoteResolved(
        graph,
        somePackage,
        someVersion,
        someRegistryUrl,
        {}
      );

      const node = tryGetGraphNode(graph, somePackage, someVersion);
      expect(node).toEqual({
        type: NodeType.Resolved,
        source: someRegistryUrl,
        dependencies: {},
      });
    });

    it("should mark dependencies as unresolved", () => {
      let graph = makeGraphFromSeed(somePackage, someVersion);

      graph = markRemoteResolved(
        graph,
        somePackage,
        someVersion,
        someRegistryUrl,
        { [otherPackage]: someVersion }
      );

      const node = tryGetGraphNode(graph, otherPackage, someVersion);
      expect(node).toEqual({
        type: NodeType.Unresolved,
      });
    });

    it("should not mark already resolved dependencies as unresolved", () => {
      let graph = makeGraphFromSeed(somePackage, someVersion);

      graph = markRemoteResolved(
        graph,
        somePackage,
        someVersion,
        someRegistryUrl,
        { [otherPackage]: someVersion, [anotherPackage]: someVersion }
      );
      graph = markBuiltInResolved(graph, anotherPackage, someVersion);
      graph = markRemoteResolved(
        graph,
        otherPackage,
        someVersion,
        someRegistryUrl,
        // anotherPackage is already resolved and should not be marked as unresolved
        { [anotherPackage]: someVersion }
      );

      const node = tryGetGraphNode(graph, anotherPackage, someVersion);
      expect(node?.type).toEqual(NodeType.Resolved);
    });
  });

  describe("mark failed", () => {
    it("should mark the given package as failed", () => {
      let graph = makeGraphFromSeed(somePackage, someVersion);

      const errors = {
        [someRegistryUrl]: new PackumentNotFoundError(somePackage),
      };
      graph = markFailed(graph, somePackage, someVersion, errors);

      const node = tryGetGraphNode(graph, somePackage, someVersion);
      expect(node).toEqual({
        type: NodeType.Failed,
        errors,
      });
    });
  });
});
