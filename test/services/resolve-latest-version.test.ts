import { mockService } from "./service.mock";
import { makeResolveLatestVersion } from "../../src/services/resolve-latest-version";
import { DomainName } from "../../src/domain/domain-name";
import { UnityPackument } from "../../src/domain/packument";
import { Registry } from "../../src/domain/registry";
import { exampleRegistryUrl } from "../domain/data-registry";
import { unityRegistryUrl } from "../../src/domain/registry-url";
import { FetchPackument } from "../../src/io/packument-io";
import { SemanticVersion } from "../../src/domain/semantic-version";

describe("resolve latest version service", () => {
  const somePackage = DomainName.parse("com.some.package");

  const exampleRegistry: Registry = { url: exampleRegistryUrl, auth: null };
  const upstreamRegistry: Registry = { url: unityRegistryUrl, auth: null };

  function makeDependencies() {
    const fetchPackument = mockService<FetchPackument>();

    const resolveLatestVersion = makeResolveLatestVersion(fetchPackument);
    return { resolveLatestVersion, fetchPackument } as const;
  }

  it("should be null if not given any sources", async () => {
    const { resolveLatestVersion } = makeDependencies();

    const actual = await resolveLatestVersion([], somePackage);

    expect(actual).toBeNull();
  });

  it("should get specified latest version from first packument", async () => {
    const { resolveLatestVersion, fetchPackument } = makeDependencies();
    const packument = {
      versions: { ["1.0.0" as SemanticVersion]: { version: "1.0.0" } },
      "dist-tags": { latest: "1.0.0" },
    } as UnityPackument;
    fetchPackument.mockResolvedValue(packument);

    const actual = await resolveLatestVersion([exampleRegistry], somePackage);

    expect(actual).toEqual({ value: "1.0.0", source: exampleRegistry.url });
  });

  it("should get latest listed version from first packument if no latest was specified", async () => {
    const { resolveLatestVersion, fetchPackument } = makeDependencies();
    const packument = {
      versions: { ["1.0.0" as SemanticVersion]: { version: "1.0.0" } },
    } as UnityPackument;
    fetchPackument.mockResolvedValue(packument);

    const actual = await resolveLatestVersion([exampleRegistry], somePackage);

    expect(actual).toEqual({ value: "1.0.0", source: exampleRegistry.url });
  });

  it("should check all registries", async () => {
    const { resolveLatestVersion, fetchPackument } = makeDependencies();
    const packument = {
      versions: { ["1.0.0" as SemanticVersion]: { version: "1.0.0" } },
      "dist-tags": { latest: "1.0.0" },
    } as UnityPackument;
    fetchPackument.mockResolvedValueOnce(null);
    fetchPackument.mockResolvedValueOnce(packument);

    const actual = await resolveLatestVersion(
      [exampleRegistry, upstreamRegistry],
      somePackage
    );

    expect(actual).toEqual({ value: "1.0.0", source: upstreamRegistry.url });
  });
});
