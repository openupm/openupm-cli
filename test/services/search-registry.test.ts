import npmSearch from "libnpmsearch";
import search from "libnpmsearch";
import { HttpErrorBase } from "npm-registry-fetch/lib/errors";
import { makeSearchRegistryService } from "../../src/services/search-registry";
import { Registry } from "../../src/domain/registry";
import { exampleRegistryUrl } from "../domain/data-registry";

jest.mock("libnpmsearch");

const exampleRegistry: Registry = {
  url: exampleRegistryUrl,
  auth: null,
};

function makeDependencies() {
  const searchRegistry = makeSearchRegistryService();
  return { searchRegistry } as const;
}

describe("search service", () => {
  it("should fail for error response", async () => {
    const expected = {
      message: "Idk, it failed",
      name: "FakeError",
      statusCode: 500,
    } as HttpErrorBase;
    jest.mocked(npmSearch).mockRejectedValue(expected);
    const { searchRegistry } = makeDependencies();

    const result = await searchRegistry(exampleRegistry, "wow").promise;

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });

  it("should succeed for ok response", async () => {
    const expected = [{ name: "wow" } as search.Result];
    jest.mocked(npmSearch).mockResolvedValue(expected);
    const { searchRegistry } = makeDependencies();

    const result = await searchRegistry(exampleRegistry, "wow").promise;

    expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
  });
});
