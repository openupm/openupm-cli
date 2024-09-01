import RegClient from "another-npm-registry-client";
import nock from "nock";
import { ResolveDependenciesFromRegistries } from "../../../src/app/dependency-resolving";
import { PackumentNotFoundError } from "../../../src/common-errors";
import {
  NodeType,
  tryGetGraphNode,
} from "../../../src/domain/dependency-graph";
import { DomainName } from "../../../src/domain/domain-name";
import { VersionNotFoundError } from "../../../src/domain/packument";
import { Registry } from "../../../src/domain/registry";
import { unityRegistryUrl } from "../../../src/domain/registry-url";
import { SemanticVersion } from "../../../src/domain/semantic-version";
import { fetchCheckUrlExists } from "../../../src/io/check-url";
import { getRegistryPackumentUsing } from "../../../src/io/packument-io";
import { noopLogger } from "../../../src/logging";
import { buildPackument } from "../../unit/domain/data-packument";
import { exampleRegistryUrl } from "../../unit/domain/data-registry";
import { mockUnityDocPages } from "../docs.mock";
import { mockRegistryPackuments } from "../registry.mock";

describe("dependency resolving", () => {
  const sources: Registry[] = [
    { url: exampleRegistryUrl, auth: null },
    { url: unityRegistryUrl, auth: null },
  ];

  const somePackage = DomainName.parse("com.some.package");
  const otherPackage = DomainName.parse("com.other.package");

  const someVersion = SemanticVersion.parse("1.0.0");
  const otherVersion = SemanticVersion.parse("2.0.0");

  const registryClient = new RegClient();
  const resolveDependencies = ResolveDependenciesFromRegistries(
    fetchCheckUrlExists,
    getRegistryPackumentUsing(registryClient, noopLogger)
  );

  afterEach(() => {
    nock.cleanAll();
  });

  it("should mark missing packages", async () => {
    mockUnityDocPages([]);
    mockRegistryPackuments(exampleRegistryUrl, []);
    mockRegistryPackuments(unityRegistryUrl, []);

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
        [exampleRegistryUrl]: expect.any(PackumentNotFoundError),
        [unityRegistryUrl]: expect.any(PackumentNotFoundError),
      },
    });
  });

  it("should mark missing versions", async () => {
    mockUnityDocPages([]);
    mockRegistryPackuments(exampleRegistryUrl, [
      buildPackument(somePackage, (packument) =>
        packument.addVersion(otherVersion)
      ),
    ]);
    mockRegistryPackuments(unityRegistryUrl, []);

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
        [exampleRegistryUrl]: expect.any(VersionNotFoundError),
        [unityRegistryUrl]: expect.any(PackumentNotFoundError),
      },
    });
  });

  it("should mark resolved remote packages", async () => {
    mockUnityDocPages([]);
    // The first source does not have the package
    mockRegistryPackuments(exampleRegistryUrl, []);
    // But the second does
    mockRegistryPackuments(unityRegistryUrl, [
      buildPackument(somePackage, (packument) =>
        packument.addVersion(someVersion, (version) =>
          version.addDependency(otherPackage, someVersion)
        )
      ),
    ]);

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
      source: unityRegistryUrl,
      dependencies: { [otherPackage]: someVersion },
    });
  });

  it("should mark resolved built-in packages", async () => {
    mockUnityDocPages([somePackage]);
    mockRegistryPackuments(exampleRegistryUrl, []);
    mockRegistryPackuments(unityRegistryUrl, []);

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
    mockUnityDocPages([]);
    mockRegistryPackuments(exampleRegistryUrl, [
      buildPackument(somePackage, (packument) =>
        packument.addVersion(someVersion, (version) =>
          version.addDependency(otherPackage, someVersion)
        )
      ),
    ]);
    mockRegistryPackuments(unityRegistryUrl, []);

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
    mockUnityDocPages([]);
    mockRegistryPackuments(exampleRegistryUrl, [
      buildPackument(somePackage, (packument) =>
        packument.addVersion(someVersion, (version) =>
          version.addDependency(otherPackage, someVersion)
        )
      ),
      buildPackument(otherPackage, (packument) =>
        packument.addVersion(someVersion)
      ),
    ]);
    mockRegistryPackuments(unityRegistryUrl, []);

    const graph = await resolveDependencies(
      sources,
      somePackage,
      someVersion,
      true
    );

    const node = tryGetGraphNode(graph, otherPackage, someVersion);
    expect(node).toEqual({
      type: NodeType.Resolved,
      source: exampleRegistryUrl,
      dependencies: {},
    });
  });

  it("should search backup registry if version missing in primary registry", async () => {
    mockUnityDocPages([]);
    mockRegistryPackuments(exampleRegistryUrl, []);
    mockRegistryPackuments(unityRegistryUrl, [
      buildPackument(somePackage, (packument) =>
        packument.addVersion(someVersion)
      ),
    ]);

    const graph = await resolveDependencies(
      sources,
      somePackage,
      someVersion,
      false
    );

    const node = tryGetGraphNode(graph, somePackage, someVersion);
    expect(node).toEqual({
      type: NodeType.Resolved,
      source: unityRegistryUrl,
      dependencies: {},
    });
  });
});
