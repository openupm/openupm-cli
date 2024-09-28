import type RegClient from "another-npm-registry-client";
import { default as npmSearch, default as search } from "libnpmsearch";
import npmFetch from "npm-registry-fetch";
import { DomainName } from "../../../src/domain/domain-name";
import { noopLogger } from "../../../src/domain/logging";
import {
  HttpErrorLike,
  RegistryAuthenticationError,
} from "../../../src/io/common-errors";
import {
  getAllRegistryPackumentsUsing,
  getRegistryPackumentUsing,
  searchRegistryUsing,
} from "../../../src/io/registry";
import { buildPackument } from "../../common/data-packument";
import { someRegistry } from "../../common/data-registry";
import { mockRegClientGetResult } from "./registry-client.mock";

jest.mock("npm-registry-fetch");
jest.mock("libnpmsearch");

describe("registry io", () => {
  describe("fetch all packuments", () => {
    function makeDependencies() {
      const fetchAllRegistryPackuments =
        getAllRegistryPackumentsUsing(noopLogger);
      return { fetchAllRegistryPackuments } as const;
    }

    it("should fail on non-auth error response", async () => {
      const expected: HttpErrorLike = {
        message: "Idk, it failed",
        name: "FakeError",
        statusCode: 500,
      };
      jest.mocked(npmFetch.json).mockRejectedValue(expected);
      const { fetchAllRegistryPackuments } = makeDependencies();

      await expect(fetchAllRegistryPackuments(someRegistry)).rejects.toEqual(
        expected
      );
    });

    it("should fail on auth error response", async () => {
      const expected: HttpErrorLike = {
        message: "Idk, it failed",
        name: "FakeError",
        statusCode: 401,
      };
      jest.mocked(npmFetch.json).mockRejectedValue(expected);
      const { fetchAllRegistryPackuments } = makeDependencies();

      await expect(
        fetchAllRegistryPackuments(someRegistry)
      ).rejects.toBeInstanceOf(RegistryAuthenticationError);
    });

    it("should succeed on ok response", async () => {
      jest.mocked(npmFetch.json).mockResolvedValue({
        _updated: 123,
      });
      const { fetchAllRegistryPackuments } = makeDependencies();

      const actual = await fetchAllRegistryPackuments(someRegistry);

      expect(actual).toEqual([]);
    });
  });

  describe("npm api search", () => {
    function makeDependencies() {
      const npmApiSearch = searchRegistryUsing(noopLogger);
      return { npmApiSearch } as const;
    }

    it("should fail for non-auth error response", async () => {
      const expected: HttpErrorLike = {
        message: "Idk, it failed",
        name: "FakeError",
        statusCode: 500,
      };
      jest.mocked(npmSearch).mockRejectedValue(expected);
      const { npmApiSearch } = makeDependencies();

      await expect(npmApiSearch(someRegistry, "wow")).rejects.toEqual(expected);
    });

    it("should fail for auth error response", async () => {
      const expected: HttpErrorLike = {
        message: "Idk, it failed",
        name: "FakeError",
        statusCode: 401,
      };
      jest.mocked(npmSearch).mockRejectedValue(expected);
      const { npmApiSearch } = makeDependencies();

      await expect(npmApiSearch(someRegistry, "wow")).rejects.toBeInstanceOf(
        RegistryAuthenticationError
      );
    });

    it("should succeed for ok response", async () => {
      const expected = [{ name: "wow" } as search.Result];
      jest.mocked(npmSearch).mockResolvedValue(expected);
      const { npmApiSearch } = makeDependencies();

      const actual = await npmApiSearch(someRegistry, "wow");

      expect(actual).toEqual(expected);
    });
  });

  describe("fetch", () => {
    const packageA = DomainName.parse("package-a");

    function makeDependencies() {
      const regClient: jest.Mocked<RegClient.Instance> = {
        adduser: jest.fn(),
        get: jest.fn(),
      };

      const fetchRegistryPackument = getRegistryPackumentUsing(
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

      const actual = await fetchRegistryPackument(someRegistry, packageA);

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
        },
        null
      );

      const actual = await fetchRegistryPackument(someRegistry, packageA);

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
        },
        null
      );

      await expect(
        fetchRegistryPackument(someRegistry, packageA)
      ).rejects.toBeInstanceOf(Error);
    });
  });
});
