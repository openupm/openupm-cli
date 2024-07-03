import npmSearch from "libnpmsearch";
import search from "libnpmsearch";
import { HttpErrorBase } from "npm-registry-fetch/lib/errors";
import { makeSearchRegistry } from "../../src/io/npm-search";
import { Registry } from "../../src/domain/registry";
import { exampleRegistryUrl } from "../domain/data-registry";
import { noopLogger } from "../../src/logging";
import {
  GenericNetworkError,
  RegistryAuthenticationError,
} from "../../src/io/common-errors";

jest.mock("libnpmsearch");

const exampleRegistry: Registry = {
  url: exampleRegistryUrl,
  auth: null,
};

function makeDependencies() {
  const searchRegistry = makeSearchRegistry(noopLogger);
  return { searchRegistry } as const;
}

describe("npm search", () => {
  it("should fail for non-auth error response", async () => {
    const expected = {
      message: "Idk, it failed",
      name: "FakeError",
      statusCode: 500,
    } as HttpErrorBase;
    jest.mocked(npmSearch).mockRejectedValue(expected);
    const { searchRegistry } = makeDependencies();

    await expect(searchRegistry(exampleRegistry, "wow")).rejects.toBeInstanceOf(
      GenericNetworkError
    );
  });

  it("should fail for auth error response", async () => {
    const expected = {
      message: "Idk, it failed",
      name: "FakeError",
      statusCode: 401,
    } as HttpErrorBase;
    jest.mocked(npmSearch).mockRejectedValue(expected);
    const { searchRegistry } = makeDependencies();

    await expect(searchRegistry(exampleRegistry, "wow")).rejects.toBeInstanceOf(
      RegistryAuthenticationError
    );
  });

  it("should succeed for ok response", async () => {
    const expected = [{ name: "wow" } as search.Result];
    jest.mocked(npmSearch).mockResolvedValue(expected);
    const { searchRegistry } = makeDependencies();

    const actual = await searchRegistry(exampleRegistry, "wow");

     expect(actual).toEqual(expected);
  });
});
