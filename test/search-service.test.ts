import npmSearch from "libnpmsearch";
import search from "libnpmsearch";
import { HttpErrorBase } from "npm-registry-fetch";
import { makeSearchService } from "../src/services/search";
import { Registry } from "../src/domain/registry";
import { exampleRegistryUrl } from "./data-registry";

jest.mock("libnpmsearch");

const exampleRegistry: Registry = {
  url: exampleRegistryUrl,
  auth: null,
};

describe("search service", () => {
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
