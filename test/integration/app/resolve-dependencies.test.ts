import RegClient from "another-npm-registry-client";
import nock from "nock";
import { resolveDependenciesUsing } from "../../../src/app/resolve-dependencies";
import { PackumentNotFoundError } from "../../../src/domain/common-errors";
import {
  NodeType,
  tryGetGraphNode,
} from "../../../src/domain/dependency-graph";
import { DomainName } from "../../../src/domain/domain-name";
import { partialApply } from "../../../src/domain/fp-utils";
import { noopLogger } from "../../../src/domain/logging";
import { VersionNotFoundError } from "../../../src/domain/packument";
import { Registry } from "../../../src/domain/registry";
import { unityRegistryUrl } from "../../../src/domain/registry-url";
import { SemanticVersion } from "../../../src/domain/semantic-version";
import { getRegistryPackumentUsing } from "../../../src/io/registry";
import { fetchCheckUrlExists } from "../../../src/io/www";
import { buildPackument } from "../../common/data-packument";
import { someRegistryUrl } from "../../common/data-registry";
import { mockUnityDocPages } from "../docs.mock";
import { mockRegistryPackuments } from "../registry.mock";

describe("dependency resolving", () => {
  const sources: Registry[] = [
    { url: someRegistryUrl, auth: null },
    { url: unityRegistryUrl, auth: null },
  ];

  const somePackage = DomainName.parse("com.some.package");
  const otherPackage = DomainName.parse("com.other.package");

  const someVersion = SemanticVersion.parse("1.0.0");
  const otherVersion = SemanticVersion.parse("2.0.0");

  const registryClient = new RegClient();
  const resolveDependencies = partialApply(
    resolveDependenciesUsing,
    fetchCheckUrlExists,
    getRegistryPackumentUsing(registryClient, noopLogger)
  );

  afterEach(() => {
    nock.cleanAll();
  });

  it("should mark missing packages", async () => {
    mockUnityDocPages([]);
    mockRegistryPackuments(someRegistryUrl, []);
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
        [someRegistryUrl]: expect.any(PackumentNotFoundError),
        [unityRegistryUrl]: expect.any(PackumentNotFoundError),
      },
    });
  });

  it("should mark missing versions", async () => {
    mockUnityDocPages([]);
    mockRegistryPackuments(someRegistryUrl, [
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
        [someRegistryUrl]: expect.any(VersionNotFoundError),
        [unityRegistryUrl]: expect.any(PackumentNotFoundError),
      },
    });
  });

  it("should mark resolved remote packages", async () => {
    mockUnityDocPages([]);
    // The first source does not have the package
    mockRegistryPackuments(someRegistryUrl, []);
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
    mockRegistryPackuments(someRegistryUrl, []);
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
    mockRegistryPackuments(someRegistryUrl, [
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
    mockRegistryPackuments(someRegistryUrl, [
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
      source: someRegistryUrl,
      dependencies: {},
    });
  });

  it("should search backup registry if version missing in primary registry", async () => {
    mockUnityDocPages([]);
    mockRegistryPackuments(someRegistryUrl, []);
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
