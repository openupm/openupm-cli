import npmSearch from "libnpmsearch";
import search from "libnpmsearch";
import { HttpErrorBase } from "npm-registry-fetch/lib/errors";
import { Registry } from "../../src/domain/registry";
import { exampleRegistryUrl } from "../domain/data-registry";
import { noopLogger } from "../../src/logging";
import { RegistryAuthenticationError } from "../../src/io/common-errors";
import { NpmApiSearch } from "../../src/io/npm-search";

jest.mock("libnpmsearch");

const exampleRegistry: Registry = {
  url: exampleRegistryUrl,
  auth: null,
};

describe("npm api search", () => {
  function makeDependencies() {
    const npmApiSearch = NpmApiSearch(noopLogger);
    return { npmApiSearch } as const;
  }

  it("should fail for non-auth error response", async () => {
    const expected = {
      message: "Idk, it failed",
      name: "FakeError",
      statusCode: 500,
    } as HttpErrorBase;
    jest.mocked(npmSearch).mockRejectedValue(expected);
    const { npmApiSearch } = makeDependencies();

    await expect(npmApiSearch(exampleRegistry, "wow")).rejects.toEqual(
      expected
    );
  });

  it("should fail for auth error response", async () => {
    const expected = {
      message: "Idk, it failed",
      name: "FakeError",
      statusCode: 401,
    } as HttpErrorBase;
    jest.mocked(npmSearch).mockRejectedValue(expected);
    const { npmApiSearch } = makeDependencies();

    await expect(npmApiSearch(exampleRegistry, "wow")).rejects.toBeInstanceOf(
      RegistryAuthenticationError
    );
  });

  it("should succeed for ok response", async () => {
    const expected = [{ name: "wow" } as search.Result];
    jest.mocked(npmSearch).mockResolvedValue(expected);
    const { npmApiSearch } = makeDependencies();

    const actual = await npmApiSearch(exampleRegistry, "wow");

    expect(actual).toEqual(expected);
  });
});
