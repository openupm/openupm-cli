import { buildPackument } from "../domain/data-packument";
import { HttpErrorBase } from "npm-registry-fetch/lib/errors";
import { makeDomainName } from "../../src/domain/domain-name";
import RegClient from "another-npm-registry-client";
import { Registry } from "../../src/domain/registry";
import { exampleRegistryUrl } from "../domain/data-registry";
import { mockRegClientGetResult } from "../services/registry-client.mock";
import { makeFetchPackument } from "../../src/io/packument-io";
import { noopLogger } from "../../src/logging";

describe("packument io", () => {
  describe("fetch", () => {
    const packageA = makeDomainName("package-a");
    const exampleRegistry: Registry = {
      url: exampleRegistryUrl,
      auth: null,
    };

    function makeDependencies() {
      const regClient: jest.Mocked<RegClient.Instance> = {
        adduser: jest.fn(),
        get: jest.fn(),
      };

      const fetchPackument = makeFetchPackument(regClient, noopLogger);
      return { fetchPackument, regClient } as const;
    }
    it("should get existing packument", async () => {
      // TODO: Use prop test
      const packument = buildPackument(packageA);
      const { fetchPackument, regClient } = makeDependencies();
      mockRegClientGetResult(regClient, null, packument);

      const actual = await fetchPackument(exampleRegistry, packageA);

      expect(actual).toEqual(packument);
    });

    it("should not find unknown packument", async () => {
      const { fetchPackument, regClient } = makeDependencies();
      mockRegClientGetResult(
        regClient,
        {
          message: "not found",
          name: "FakeError",
          statusCode: 404,
        } as HttpErrorBase,
        null
      );

      const actual = await fetchPackument(exampleRegistry, packageA);

      expect(actual).toBeNull();
    });

    it("should fail for errors", async () => {
      const { fetchPackument, regClient } = makeDependencies();
      mockRegClientGetResult(
        regClient,
        {
          message: "Unauthorized",
          name: "FakeError",
          statusCode: 401,
        } as HttpErrorBase,
        null
      );

      await expect(
        fetchPackument(exampleRegistry, packageA)
      ).rejects.toBeInstanceOf(Error);
    });
  });
});
