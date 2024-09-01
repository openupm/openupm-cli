import { default as npmSearch, default as search } from "libnpmsearch";
import { Registry } from "../../../src/domain/registry";
import {
  HttpErrorLike,
  RegistryAuthenticationError,
} from "../../../src/io/common-errors";
import { searchRegistryUsing } from "../../../src/io/npm-search";
import { noopLogger } from "../../../src/logging";
import { exampleRegistryUrl } from "../../unit/domain/data-registry";

jest.mock("libnpmsearch");

const exampleRegistry: Registry = {
  url: exampleRegistryUrl,
  auth: null,
};

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

    await expect(npmApiSearch(exampleRegistry, "wow")).rejects.toEqual(
      expected
    );
  });

  it("should fail for auth error response", async () => {
    const expected: HttpErrorLike = {
      message: "Idk, it failed",
      name: "FakeError",
      statusCode: 401,
    };
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
