import { mockService } from "./service.mock";
import { makeResolveRemotePackumentVersionService } from "../../src/services/resolve-remote-packument";
import { Ok } from "ts-results-es";
import { makeDomainName } from "../../src/domain/domain-name";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { Registry } from "../../src/domain/registry";
import { exampleRegistryUrl } from "../domain/data-registry";
import { PackumentNotFoundError } from "../../src/common-errors";
import { buildPackument } from "../domain/data-packument";
import { FetchPackument } from "../../src/io/packument-io";

describe("resolve remote packument service", () => {
  const somePackage = makeDomainName("com.some.package");

  const someVersion = makeSemanticVersion("1.0.0");

  const someRegistry: Registry = { url: exampleRegistryUrl, auth: null };

  function makeDependencies() {
    const fetchPackument = mockService<FetchPackument>();

    const resolveRemovePackumentVersion =
      makeResolveRemotePackumentVersionService(fetchPackument);
    return { resolveRemovePackumentVersion, fetchPackument } as const;
  }

  it("should fail if packument was not found", async () => {
    const { resolveRemovePackumentVersion, fetchPackument } =
      makeDependencies();
    fetchPackument.mockReturnValue(Ok(null).toAsyncResult());

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
    fetchPackument.mockReturnValue(Ok(packument).toAsyncResult());

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
