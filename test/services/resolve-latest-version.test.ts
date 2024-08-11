import { DomainName } from "../../src/domain/domain-name";
import { UnityPackument } from "../../src/domain/packument";
import { Registry } from "../../src/domain/registry";
import { SemanticVersion } from "../../src/domain/semantic-version";
import { GetRegistryPackument } from "../../src/io/packument-io";
import { makeResolveLatestVersion } from "../../src/services/resolve-latest-version";
import { exampleRegistryUrl } from "../domain/data-registry";
import { mockService } from "./service.mock";

describe("resolve latest version", () => {
  const somePackage = DomainName.parse("com.some.package");

  const exampleRegistry: Registry = { url: exampleRegistryUrl, auth: null };

  function makeDependencies() {
    const getRegistryPackument = mockService<GetRegistryPackument>();

    const resolveLatestVersion = makeResolveLatestVersion(getRegistryPackument);
    return { resolveLatestVersion, getRegistryPackument } as const;
  }

  it("should get specified latest version from packument", async () => {
    const { resolveLatestVersion, getRegistryPackument } = makeDependencies();
    const packument = {
      versions: { ["1.0.0" as SemanticVersion]: { version: "1.0.0" } },
      "dist-tags": { latest: "1.0.0" },
    } as UnityPackument;
    getRegistryPackument.mockResolvedValue(packument);

    const actual = await resolveLatestVersion(exampleRegistry, somePackage);

    expect(actual).toEqual("1.0.0");
  });

  it("should get latest listed version from packument if no latest was specified", async () => {
    const { resolveLatestVersion, getRegistryPackument } = makeDependencies();
    const packument = {
      versions: { ["1.0.0" as SemanticVersion]: { version: "1.0.0" } },
    } as UnityPackument;
    getRegistryPackument.mockResolvedValue(packument);

    const actual = await resolveLatestVersion(exampleRegistry, somePackage);

    expect(actual).toEqual("1.0.0");
  });
});
