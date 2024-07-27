import { mockService } from "./service.mock";
import { makeResolveRemotePackumentVersion } from "../../src/services/resolve-remote-packument-version";
import { DomainName } from "../../src/domain/domain-name";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { Registry } from "../../src/domain/registry";
import { exampleRegistryUrl } from "../domain/data-registry";
import { PackumentNotFoundError } from "../../src/common-errors";
import { buildPackument } from "../domain/data-packument";
import { FetchPackument } from "../../src/io/packument-io";

describe("resolve remote packument version", () => {
  const somePackage = DomainName.parse("com.some.package");

  const someVersion = makeSemanticVersion("1.0.0");

  const someRegistry: Registry = { url: exampleRegistryUrl, auth: null };

  function makeDependencies() {
    const fetchPackument = mockService<FetchPackument>();

    const resolveRemovePackumentVersion =
      makeResolveRemotePackumentVersion(fetchPackument);
    return { resolveRemovePackumentVersion, fetchPackument } as const;
  }

  it("should fail if packument was not found", async () => {
    const { resolveRemovePackumentVersion, fetchPackument } =
      makeDependencies();
    fetchPackument.mockResolvedValue(null);

    const result = await resolveRemovePackumentVersion(
      somePackage,
      someVersion,
      someRegistry
    ).promise;

    expect(result).toBeError((error) =>
      expect(error).toBeInstanceOf(PackumentNotFoundError)
    );
  });

  it("should give resolved packument-version", async () => {
    const { resolveRemovePackumentVersion, fetchPackument } =
      makeDependencies();
    const packument = buildPackument(somePackage, (packument) =>
      packument.addVersion(someVersion, (version) =>
        version.addDependency("com.other.package", "1.0.0")
      )
    );
    fetchPackument.mockResolvedValue(packument);

    const result = await resolveRemovePackumentVersion(
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
