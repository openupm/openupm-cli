import { makeResolveRemotePackument } from "../../src/services/resolve-remote-packument";
import { makeDomainName } from "../../src/domain/domain-name";
import { Registry } from "../../src/domain/registry";
import { exampleRegistryUrl } from "../domain/data-registry";
import { unityRegistryUrl } from "../../src/domain/registry-url";
import { buildPackument } from "../domain/data-packument";
import { mockService } from "./service.mock";
import { FetchPackument } from "../../src/io/packument-io";
import { GenericNetworkError } from "../../src/io/common-errors";
import { AsyncErr, AsyncOk } from "../../src/utils/result-utils";

describe("resolve remove packument", () => {
  const exampleName = makeDomainName("com.some.package");

  const exampleRegistryA: Registry = { url: exampleRegistryUrl, auth: null };

  const exampleRegistryB: Registry = { url: unityRegistryUrl, auth: null };

  const examplePackument = buildPackument(exampleName);

  function makeDependencies() {
    const fetchPackument = mockService<FetchPackument>();
    fetchPackument.mockReturnValue(AsyncOk(examplePackument));

    const resolveRemotePackument = makeResolveRemotePackument(fetchPackument);
    return { resolveRemotePackument, fetchPackument } as const;
  }

  it("should find packument in first registry if possible", async () => {
    const { resolveRemotePackument } = makeDependencies();

    const result = await resolveRemotePackument(exampleName, [
      exampleRegistryA,
      exampleRegistryB,
    ]).promise;

    expect(result).toBeOk((actual) =>
      expect(actual).toEqual({
        packument: examplePackument,
        source: exampleRegistryA.url,
      })
    );
  });

  it("should find packument in first registry if possible", async () => {
    const { resolveRemotePackument, fetchPackument } = makeDependencies();
    fetchPackument.mockImplementation((registry) =>
      AsyncOk(registry === exampleRegistryB ? examplePackument : null)
    );

    const result = await resolveRemotePackument(exampleName, [
      exampleRegistryA,
      exampleRegistryB,
    ]).promise;

    expect(result).toBeOk((actual) =>
      expect(actual).toEqual({
        packument: examplePackument,
        source: exampleRegistryB.url,
      })
    );
  });

  it("should be null if not providing any registries", async () => {
    const { resolveRemotePackument } = makeDependencies();

    const result = await resolveRemotePackument(exampleName, []).promise;

    expect(result).toBeOk((actual) => expect(actual).toBeNull());
  });

  it("should be null if packument is not found in any registry", async () => {
    const { resolveRemotePackument, fetchPackument } = makeDependencies();
    fetchPackument.mockReturnValue(AsyncOk(null));

    const result = await resolveRemotePackument(exampleName, [
      exampleRegistryA,
      exampleRegistryB,
    ]).promise;

    expect(result).toBeOk((actual) => expect(actual).toBeNull());
  });

  it("should fail if any packument fetch failed", async () => {
    const expected = new GenericNetworkError();
    const { resolveRemotePackument, fetchPackument } = makeDependencies();
    fetchPackument.mockReturnValue(AsyncErr(expected));

    const result = await resolveRemotePackument(exampleName, [
      exampleRegistryA,
      exampleRegistryB,
    ]).promise;

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });
});
