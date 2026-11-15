import { default as npmSearch, default as search } from "libnpmsearch";
import npmFetch from "npm-registry-fetch";
import { noopLogger } from "../../../src/domain/logging";
import {
  HttpErrorLike,
  RegistryAuthenticationError,
} from "../../../src/io/common-errors";
import { DomainName } from "../../../src/domain/domain-name";
import type { Registry } from "../../../src/domain/registry";
import {
  getAllRegistryPackumentsUsing,
  getRegistryPackumentUsing,
  searchRegistryUsing,
} from "../../../src/io/registry";
import { someRegistry } from "../../common/data-registry";

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

  describe("fetch packument", () => {
    it("should use registry auth", async () => {
      const registry: Registry = {
        ...someRegistry,
        auth: { token: "Some token" },
      };
      jest.mocked(npmFetch.json).mockResolvedValue({ name: "some.package" });
      const getRegistryPackument = getRegistryPackumentUsing(noopLogger);

      await getRegistryPackument(registry, DomainName.parse("some.package"));

      expect(npmFetch.json).toHaveBeenCalledWith(
        `${registry.url}/some.package`,
        expect.objectContaining({ forceAuth: registry.auth })
      );
    });
  });
});
