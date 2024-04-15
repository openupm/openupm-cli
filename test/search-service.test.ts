import npmSearch from "libnpmsearch";
import search from "libnpmsearch";
import npmFetch, { HttpErrorBase } from "npm-registry-fetch";
import { makeSearchService } from "../src/services/search-service";
import { Registry } from "../src/services/add-user-service";
import { exampleRegistryUrl } from "./mock-registry";

jest.mock("libnpmsearch");
jest.mock("npm-registry-fetch");

const exampleRegistry: Registry = {
  url: exampleRegistryUrl,
  auth: null,
};

describe("search -service", () => {
  describe("search", () => {
    it("should fail for error response", async () => {
      const expected = {
        message: "Idk, it failed",
        name: "FakeError",
        statusCode: 500,
      } as HttpErrorBase;
      jest.mocked(npmSearch).mockRejectedValue(expected);
      const service = makeSearchService();

      const result = await service.trySearch(exampleRegistry, "wow").promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should succeed for ok response", async () => {
      const expected = [{ name: "wow" } as search.Result];
      jest.mocked(npmSearch).mockResolvedValue(expected);
      const service = makeSearchService();

      const result = await service.trySearch(exampleRegistry, "wow").promise;

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
      const service = makeSearchService();

      const result = await service.tryGetAll(exampleRegistry).promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should succeed on ok response", async () => {
      const expected = {
        _update: 123,
      };
      jest.mocked(npmFetch.json).mockResolvedValue(expected);
      const service = makeSearchService();

      const result = await service.tryGetAll(exampleRegistry).promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });
  });
});
