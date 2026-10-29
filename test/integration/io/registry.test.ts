import { default as npmSearch, default as search } from "libnpmsearch";
import { loginCouch } from "npm-profile";
import npmFetch from "npm-registry-fetch";
import { noopLogger } from "../../../src/domain/logging";
import {
  HttpErrorLike,
  RegistryAuthenticationError,
} from "../../../src/io/common-errors";
import {
  getAllRegistryPackumentsUsing,
  getAuthTokenUsing,
  searchRegistryUsing,
} from "../../../src/io/registry";
import { someRegistry, someRegistryUrl } from "../../common/data-registry";

jest.mock("npm-registry-fetch");
jest.mock("libnpmsearch");
jest.mock("npm-profile");

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

  describe("get auth token", () => {
    function makeDependencies() {
      const getAuthToken = getAuthTokenUsing(noopLogger);
      return { getAuthToken } as const;
    }

    it("should log in to the given registry with username and password", async () => {
      jest
        .mocked(loginCouch)
        .mockResolvedValue({ token: "some-token", username: "some-user" });
      const { getAuthToken } = makeDependencies();

      await getAuthToken(someRegistryUrl, "some-user", "some-password");

      expect(loginCouch).toHaveBeenCalledWith("some-user", "some-password", {
        registry: someRegistryUrl,
      });
    });

    it("should return token from login", async () => {
      jest
        .mocked(loginCouch)
        .mockResolvedValue({ token: "some-token", username: "some-user" });
      const { getAuthToken } = makeDependencies();

      const actual = await getAuthToken(
        someRegistryUrl,
        "some-user",
        "some-password"
      );

      expect(actual).toEqual("some-token");
    });

    it("should fail if login fails", async () => {
      jest.mocked(loginCouch).mockRejectedValue(new Error("Unauthorized"));
      const { getAuthToken } = makeDependencies();

      await expect(
        getAuthToken(someRegistryUrl, "some-user", "some-password")
      ).rejects.toBeInstanceOf(RegistryAuthenticationError);
    });
  });
});
