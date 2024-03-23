import "assert";
import { exampleRegistryUrl } from "./mock-registry";
import { makeDomainName } from "../src/domain/domain-name";
import { makeNpmClient, Registry } from "../src/npm-client";
import { UnityPackument } from "../src/domain/packument";
import RegClient from "another-npm-registry-client";
import { HttpErrorBase } from "npm-registry-fetch";
import { buildPackument } from "./data-packument";

jest.mock("another-npm-registry-client");

const packageA = makeDomainName("package-a");

const exampleRegistry: Registry = {
  url: exampleRegistryUrl,
  auth: null,
};

function mockRegClientGetResult(
  error: HttpErrorBase | null,
  packument: UnityPackument | null
) {
  jest.mocked(RegClient).mockImplementation(() => ({
    adduser: () => undefined,
    get: (_1, _2, cb) => {
      cb(error, packument!, null!, null!);
    },
  }));
}

describe("npm-client", () => {
  describe("fetch packument", () => {
    it("should get existing packument", async () => {
      // TODO: Use prop test
      const packument = buildPackument(packageA);
      mockRegClientGetResult(null, packument);
      const client = makeNpmClient();

      const result = await client.tryFetchPackument(exampleRegistry, packageA)
        .promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual(packument));
    });

    it("should not find unknown packument", async () => {
      mockRegClientGetResult(
        {
          message: "not found",
          name: "FakeError",
          statusCode: 404,
        } as HttpErrorBase,
        null
      );
      const client = makeNpmClient();

      const result = await client.tryFetchPackument(exampleRegistry, packageA)
        .promise;

      expect(result).toBeOk((actual) => expect(actual).toBeNull());
    });

    it("should fail for errors", async () => {
      mockRegClientGetResult(
        {
          message: "Unauthorized",
          name: "FakeError",
          statusCode: 401,
        } as HttpErrorBase,
        null
      );
      const client = makeNpmClient();

      const result = await client.tryFetchPackument(exampleRegistry, packageA)
        .promise;

      expect(result).toBeError();
    });
  });
});
