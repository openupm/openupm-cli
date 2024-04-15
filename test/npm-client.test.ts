import "assert";
import { exampleRegistryUrl } from "./mock-registry";
import {
  AuthenticationError,
  makeNpmClient,
  Registry,
} from "../src/npm-client";
import RegClient, { AddUserResponse } from "another-npm-registry-client";
import npmFetch, { HttpErrorBase } from "npm-registry-fetch";
import { Response } from "request";
import npmSearch from "libnpmsearch";
import search from "libnpmsearch";

jest.mock("another-npm-registry-client");
jest.mock("libnpmsearch");
jest.mock("npm-registry-fetch");

const exampleRegistry: Registry = {
  url: exampleRegistryUrl,
  auth: null,
};

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

  describe("get all", () => {
    it("should fail on error response", async () => {
      const expected = {
        message: "Idk, it failed",
        name: "FakeError",
        statusCode: 500,
      } as HttpErrorBase;
      jest.mocked(npmFetch.json).mockRejectedValue(expected);
      const client = makeNpmClient();

      const result = await client.tryGetAll(exampleRegistry).promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should succeed on ok response", async () => {
      const expected = {
        _update: 123,
      };
      jest.mocked(npmFetch.json).mockResolvedValue(expected);
      const client = makeNpmClient();

      const result = await client.tryGetAll(exampleRegistry).promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });
  });
});
