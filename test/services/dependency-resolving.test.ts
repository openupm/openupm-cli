import { makeResolveDependency } from "../../src/services/dependency-resolving";
import { mockService } from "./service.mock";
import { FetchPackument } from "../../src/io/packument-io";
import { CheckIsBuiltInPackage } from "../../src/services/built-in-package-check";
import { exampleRegistryUrl } from "../domain/data-registry";
import { unityRegistryUrl } from "../../src/domain/registry-url";
import { makeDomainName } from "../../src/domain/domain-name";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { Registry } from "../../src/domain/registry";
import { NodeType, tryGetGraphNode } from "../../src/domain/dependency-graph";
import { PackumentNotFoundError } from "../../src/common-errors";
import { VersionNotFoundError } from "../../src/domain/packument";

describe("dependency resolving", () => {
  const sources: Registry[] = [
    { url: exampleRegistryUrl, auth: null },
    { url: unityRegistryUrl, auth: null },
  ];

  const somePackage = makeDomainName("com.some.package");
  const otherPackage = makeDomainName("com.other.package");

  const someVersion = makeSemanticVersion("1.0.0");
  const otherVersion = makeSemanticVersion("2.0.0");

  function makeDependencies() {
    const fetchPackument = mockService<FetchPackument>();

    const checkIsBuiltInPackage = mockService<CheckIsBuiltInPackage>();
    checkIsBuiltInPackage.mockResolvedValue(false);

    const resolveDependencies = makeResolveDependency(
      fetchPackument,
      checkIsBuiltInPackage
    );
    return {
      resolveDependencies,
      fetchPackument,
      checkIsBuiltInPackage,
    } as const;
  }

  it("should mark missing packages", async () => {
    const { resolveDependencies, fetchPackument } = makeDependencies();
    fetchPackument.mockResolvedValue(null);

    const graph = await resolveDependencies(
      sources,
      somePackage,
      someVersion,
      false
    );

    const node = tryGetGraphNode(graph, somePackage, someVersion);
    expect(node).toEqual({
      type: NodeType.Failed,
      errors: {
        [sources[0]!.url]: expect.any(PackumentNotFoundError),
        [sources[1]!.url]: expect.any(PackumentNotFoundError),
      },
    });
  });

  it("should mark missing versions", async () => {
    const { resolveDependencies, fetchPackument } = makeDependencies();
    fetchPackument.mockResolvedValue({
      name: somePackage,
      versions: {
        [otherVersion]: { name: somePackage, version: otherVersion },
      },
    });

    const graph = await resolveDependencies(
      sources,
      somePackage,
      someVersion,
      false
    );

    const node = tryGetGraphNode(graph, somePackage, someVersion);
    expect(node).toEqual({
      type: NodeType.Failed,
      errors: {
        [sources[0]!.url]: expect.any(VersionNotFoundError),
        [sources[1]!.url]: expect.any(VersionNotFoundError),
      },
    });
  });

  it("should mark resolved remote packages", async () => {
    const { resolveDependencies, fetchPackument } = makeDependencies();
    // The first source does not have the package
    fetchPackument.mockResolvedValueOnce(null);
    // But the second does
    fetchPackument.mockResolvedValueOnce({
      name: somePackage,
      versions: {
        [someVersion]: {
          name: somePackage,
          version: someVersion,
          dependencies: { [otherPackage]: someVersion },
        },
      },
    });

    const graph = await resolveDependencies(
      sources,
      somePackage,
      someVersion,
      false
    );

    const node = tryGetGraphNode(graph, somePackage, someVersion);
    expect(node).toEqual({
      type: NodeType.Resolved,
      // Package is found in second source
      source: sources[1]!.url,
      dependencies: { [otherPackage]: someVersion },
    });
  });

  it("should mark resolved built-in packages", async () => {
    const { resolveDependencies, checkIsBuiltInPackage } = makeDependencies();
    checkIsBuiltInPackage.mockResolvedValue(true);

    const graph = await resolveDependencies(
      sources,
      somePackage,
      someVersion,
      false
    );

    const node = tryGetGraphNode(graph, somePackage, someVersion);
    expect(node).toEqual({
      type: NodeType.Resolved,
      source: "built-in",
      dependencies: {},
    });
  });

  it("should mark dependencies when resolving shallow", async () => {
    const { resolveDependencies, fetchPackument } = makeDependencies();
    fetchPackument.mockResolvedValue({
      name: somePackage,
      versions: {
        [someVersion]: {
          name: somePackage,
          version: someVersion,
          dependencies: { [otherPackage]: someVersion },
        },
      },
    });

    const graph = await resolveDependencies(
      sources,
      somePackage,
      someVersion,
      false
    );

    const node = tryGetGraphNode(graph, otherPackage, someVersion);
    expect(node).toEqual({
      type: NodeType.Unresolved,
    });
  });

  it("should resolve dependencies when resolving deep", async () => {
    const { resolveDependencies, fetchPackument } = makeDependencies();
    // First resolve somePackage
    fetchPackument.mockResolvedValueOnce({
      name: somePackage,
      versions: {
        [someVersion]: {
          name: somePackage,
          version: someVersion,
          dependencies: { [otherPackage]: someVersion },
        },
      },
    });
    // then resolve otherPackage
    fetchPackument.mockResolvedValueOnce({
      name: otherPackage,
      versions: {
        [someVersion]: {
          name: otherPackage,
          version: someVersion,
        },
      },
    });

    const graph = await resolveDependencies(
      sources,
      somePackage,
      someVersion,
      true
    );

    const node = tryGetGraphNode(graph, otherPackage, someVersion);
    expect(node).toEqual({
      type: NodeType.Resolved,
      source: sources[0]!.url,
      dependencies: {},
    });
  });

  it("should search backup registry if version missing in primary registry", async () => {
    const { resolveDependencies, fetchPackument } = makeDependencies();
    // First resolve somePackage
    fetchPackument.mockResolvedValueOnce({
      name: somePackage,
      versions: {
        [otherVersion]: {
          name: somePackage,
          version: otherVersion,
        },
      },
    });
    // then resolve otherPackage
    fetchPackument.mockResolvedValueOnce({
      name: somePackage,
      versions: {
        [someVersion]: {
          name: somePackage,
          version: someVersion,
        },
      },
    });

    const graph = await resolveDependencies(
      sources,
      somePackage,
      someVersion,
      false
    );

    const node = tryGetGraphNode(graph, somePackage, someVersion);
    expect(node).toEqual({
      type: NodeType.Resolved,
      source: sources[1]!.url,
      dependencies: {},
    });
  });
});
