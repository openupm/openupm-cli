import { buildPackument } from "../domain/data-packument";
import { HttpErrorBase } from "npm-registry-fetch/lib/errors";
import { DomainName } from "../../src/domain/domain-name";
import RegClient from "another-npm-registry-client";
import { Registry } from "../../src/domain/registry";
import { exampleRegistryUrl } from "../domain/data-registry";
import { mockRegClientGetResult } from "../services/registry-client.mock";
import { FetchRegistryPackument } from "../../src/io/packument-io";
import { noopLogger } from "../../src/logging";

describe("packument io", () => {
  describe("fetch", () => {
    const packageA = DomainName.parse("package-a");
    const exampleRegistry: Registry = {
      url: exampleRegistryUrl,
      auth: null,
    };

    function makeDependencies() {
      const regClient: jest.Mocked<RegClient.Instance> = {
        adduser: jest.fn(),
        get: jest.fn(),
      };

      const fetchRegistryPackument = FetchRegistryPackument(
        regClient,
        noopLogger
      );
      return { fetchRegistryPackument, regClient } as const;
    }
    it("should get existing packument", async () => {
      // TODO: Use prop test
      const packument = buildPackument(packageA);
      const { fetchRegistryPackument, regClient } = makeDependencies();
      mockRegClientGetResult(regClient, null, packument);

      const actual = await fetchRegistryPackument(exampleRegistry, packageA);

      expect(actual).toEqual(packument);
    });

    it("should not find unknown packument", async () => {
      const { fetchRegistryPackument, regClient } = makeDependencies();
      mockRegClientGetResult(
        regClient,
        {
          message: "not found",
          name: "FakeError",
          statusCode: 404,
        } as HttpErrorBase,
        null
      );

      const actual = await fetchRegistryPackument(exampleRegistry, packageA);

      expect(actual).toBeNull();
    });

    it("should fail for errors", async () => {
      const { fetchRegistryPackument, regClient } = makeDependencies();
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
        fetchRegistryPackument(exampleRegistry, packageA)
      ).rejects.toBeInstanceOf(Error);
    });
  });
});
