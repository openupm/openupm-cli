import { PackumentNotFoundError } from "../../src/common-errors";
import { DomainName } from "../../src/domain/domain-name";
import { Registry } from "../../src/domain/registry";
import { SemanticVersion } from "../../src/domain/semantic-version";
import { GetRegistryPackument } from "../../src/io/packument-io";
import { FetchRegistryPackumentVersion } from "../../src/services/get-registry-packument-version";
import { buildPackument } from "../domain/data-packument";
import { exampleRegistryUrl } from "../domain/data-registry";
import { mockService } from "./service.mock";

describe("fetch registrypackument version", () => {
  const somePackage = DomainName.parse("com.some.package");

  const someVersion = SemanticVersion.parse("1.0.0");

  const someRegistry: Registry = { url: exampleRegistryUrl, auth: null };

  function makeDependencies() {
    const getRegistryPackument = mockService<GetRegistryPackument>();

    const fetchRegistryPackumentVersion =
      FetchRegistryPackumentVersion(getRegistryPackument);
    return { fetchRegistryPackumentVersion, getRegistryPackument } as const;
  }

  it("should fail if packument was not found", async () => {
    const { fetchRegistryPackumentVersion, getRegistryPackument } =
      makeDependencies();
    getRegistryPackument.mockResolvedValue(null);

    const result = await fetchRegistryPackumentVersion(
      somePackage,
      someVersion,
      someRegistry
    ).promise;

    expect(result).toBeError((error) =>
      expect(error).toBeInstanceOf(PackumentNotFoundError)
    );
  });

  it("should give resolved packument-version", async () => {
    const { fetchRegistryPackumentVersion, getRegistryPackument } =
      makeDependencies();
    const packument = buildPackument(somePackage, (packument) =>
      packument.addVersion(someVersion, (version) =>
        version.addDependency("com.other.package", "1.0.0")
      )
    );
    getRegistryPackument.mockResolvedValue(packument);

    const result = await fetchRegistryPackumentVersion(
      somePackage,
      someVersion,
      someRegistry
    ).promise;

    expect(result).toBeOk((value) =>
      expect(value).toMatchObject({
        packument,
        packumentVersion: {
          name: somePackage,
          version: someVersion,
          dependencies: { "com.other.package": "1.0.0" },
        },
        source: someRegistry.url,
      })
    );
  });
});
