import { mockService } from "./service.mock";
import { FetchPackumentService } from "../../src/services/fetch-packument";
import { makeResolveLatestVersionService } from "../../src/services/resolve-latest-version";
import { makeDomainName } from "../../src/domain/domain-name";
import { PackumentNotFoundError } from "../../src/common-errors";
import { Ok } from "ts-results-es";
import { UnityPackument } from "../../src/domain/packument";
import { Registry } from "../../src/domain/registry";
import { exampleRegistryUrl } from "../domain/data-registry";
import { NoVersionsError } from "../../src/packument-resolving";
import { unityRegistryUrl } from "../../src/domain/registry-url";

describe("resolve latest version service", () => {
  const somePackage = makeDomainName("com.some.package");

  const exampleRegistry: Registry = { url: exampleRegistryUrl, auth: null };
  const upstreamRegistry: Registry = { url: unityRegistryUrl, auth: null };

  function makeDependencies() {
    const fetchPackument = mockService<FetchPackumentService>();

    const resolveLatestVersion =
      makeResolveLatestVersionService(fetchPackument);
    return { resolveLatestVersion, fetchPackument } as const;
  }

  it("should fail if not given any sources", async () => {
    const { resolveLatestVersion } = makeDependencies();

    const result = await resolveLatestVersion([], somePackage).promise;

    expect(result).toBeError((error) =>
      expect(error).toBeInstanceOf(PackumentNotFoundError)
    );
  });

  it("should get specified latest version from first packument", async () => {
    const { resolveLatestVersion, fetchPackument } = makeDependencies();
    const packument = { "dist-tags": { latest: "1.0.0" } } as UnityPackument;
    fetchPackument.mockReturnValue(Ok(packument).toAsyncResult());

    const result = await resolveLatestVersion([exampleRegistry], somePackage)
      .promise;

    expect(result).toBeOk((value) => expect(value).toEqual("1.0.0"));
  });

  it("should get latest listed version from first packument if no latest was specified", async () => {
    const { resolveLatestVersion, fetchPackument } = makeDependencies();
    const packument = {
      versions: { ["1.0.0"]: {} },
    } as unknown as UnityPackument;
    fetchPackument.mockReturnValue(Ok(packument).toAsyncResult());

    const result = await resolveLatestVersion([exampleRegistry], somePackage)
      .promise;

    expect(result).toBeOk((value) => expect(value).toEqual("1.0.0"));
  });

  it("should fail if packument had no versions", async () => {
    const { resolveLatestVersion, fetchPackument } = makeDependencies();
    const packument = { versions: {} } as UnityPackument;
    fetchPackument.mockReturnValue(Ok(packument).toAsyncResult());

    const result = await resolveLatestVersion([exampleRegistry], somePackage)
      .promise;

    expect(result).toBeError((error) =>
      expect(error).toBeInstanceOf(NoVersionsError)
    );
  });

  it("should check all registries", async () => {
    const { resolveLatestVersion, fetchPackument } = makeDependencies();
    const packument = { "dist-tags": { latest: "1.0.0" } } as UnityPackument;
    fetchPackument.mockReturnValueOnce(Ok(null).toAsyncResult());
    fetchPackument.mockReturnValueOnce(Ok(packument).toAsyncResult());

    const result = await resolveLatestVersion(
      [exampleRegistry, upstreamRegistry],
      somePackage
    ).promise;

    expect(result).toBeOk((value) => expect(value).toEqual("1.0.0"));
  });
});
