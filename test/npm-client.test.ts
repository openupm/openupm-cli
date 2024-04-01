import "assert";
import { exampleRegistryUrl } from "./mock-registry";
import { makeDomainName } from "../src/domain/domain-name";
import {
  AuthenticationError,
  makeNpmClient,
  Registry,
} from "../src/npm-client";
import { UnityPackument } from "../src/domain/packument";
import RegClient, { AddUserResponse } from "another-npm-registry-client";
import { HttpErrorBase } from "npm-registry-fetch";
import { buildPackument } from "./data-packument";
import { Response } from "request";
import npmSearch from "libnpmsearch";
import { createDeflateRaw } from "node:zlib";
import search from "libnpmsearch";

jest.mock("another-npm-registry-client");
jest.mock("libnpmsearch");

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

function mockRegClientAddUserResult(
  error: HttpErrorBase | null,
  responseData: AddUserResponse | null,
  response: Pick<Response, "statusMessage" | "statusCode"> | null
) {
  jest.mocked(RegClient).mockImplementation(() => ({
    adduser: (_1, _2, cb) =>
      cb(error, responseData!, null!, response! as Response),
    get: () => undefined,
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

  describe("add user", () => {
    it("should give token for valid user", async () => {
      const expected = "some token";
      mockRegClientAddUserResult(
        null,
        {
          ok: true,
          token: expected,
        },
        null
      );
      const client = makeNpmClient();

      const result = await client.addUser(
        exampleRegistryUrl,
        "valid-user",
        "valid@user.com",
        "valid-password"
      ).promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });

    it("should fail for not-ok response", async () => {
      mockRegClientAddUserResult(
        null,
        {
          ok: false,
        },
        {
          statusMessage: "bad user",
          statusCode: 401,
        }
      );
      const client = makeNpmClient();

      const result = await client.addUser(
        exampleRegistryUrl,
        "bad-user",
        "bad@user.com",
        "bad-password"
      ).promise;

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(AuthenticationError)
      );
    });

    it("should fail for error response", async () => {
      mockRegClientAddUserResult({} as HttpErrorBase, null, {
        statusMessage: "bad user",
        statusCode: 401,
      });
      const client = makeNpmClient();

      const result = await client.addUser(
        exampleRegistryUrl,
        "bad-user",
        "bad@user.com",
        "bad-password"
      ).promise;

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(AuthenticationError)
      );
    });
  });

  describe("search", () => {
    it("should fail for error response", async () => {
      const expected = {
        message: "Idk, it failed",
        name: "FakeError",
        statusCode: 500,
      } as HttpErrorBase;
      jest.mocked(npmSearch).mockRejectedValue(expected);
      const client = makeNpmClient();

      const result = await client.trySearch(exampleRegistry, "wow").promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should succeed for ok response", async () => {
      const expected = [{ name: "wow" } as search.Result];
      jest.mocked(npmSearch).mockResolvedValue(expected);
      const client = makeNpmClient();

      const result = await client.trySearch(exampleRegistry, "wow").promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });
  });
});
