import npmFetch from "npm-registry-fetch";
import { Registry } from "../../../src/domain/registry";
import { getAllRegistryPackumentsUsing } from "../../../src/io/all-packuments-io";
import {
  HttpErrorLike,
  RegistryAuthenticationError,
} from "../../../src/io/common-errors";
import { noopLogger } from "../../../src/logging";
import { exampleRegistryUrl } from "../domain/data-registry";

jest.mock("npm-registry-fetch");

const exampleRegistry: Registry = {
  url: exampleRegistryUrl,
  auth: null,
};

function makeDependencies() {
  const fetchAllRegistryPackuments = getAllRegistryPackumentsUsing(noopLogger);
  return { fetchAllRegistryPackuments } as const;
}

describe("fetch all packuments", () => {
  it("should fail on non-auth error response", async () => {
    const expected: HttpErrorLike = {
      message: "Idk, it failed",
      name: "FakeError",
      statusCode: 500,
    };
    jest.mocked(npmFetch.json).mockRejectedValue(expected);
    const { fetchAllRegistryPackuments } = makeDependencies();

    await expect(fetchAllRegistryPackuments(exampleRegistry)).rejects.toEqual(
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
      fetchAllRegistryPackuments(exampleRegistry)
    ).rejects.toBeInstanceOf(RegistryAuthenticationError);
  });

  it("should succeed on ok response", async () => {
    const expected = {
      _update: 123,
    };
    jest.mocked(npmFetch.json).mockResolvedValue(expected);
    const { fetchAllRegistryPackuments } = makeDependencies();

    const actual = await fetchAllRegistryPackuments(exampleRegistry);

    expect(actual).toEqual(expected);
  });
});
