import npmFetch from "npm-registry-fetch";
import { makeAllPackumentsFetcher } from "../../src/io/all-packuments-io";
import { Registry } from "../../src/domain/registry";
import { exampleRegistryUrl } from "../domain/data-registry";
import { HttpErrorBase } from "npm-registry-fetch/lib/errors";
import { noopLogger } from "../../src/logging";
import {
  GenericNetworkError,
  RegistryAuthenticationError,
} from "../../src/io/common-errors";

jest.mock("npm-registry-fetch");

const exampleRegistry: Registry = {
  url: exampleRegistryUrl,
  auth: null,
};

function makeDependencies() {
  const getAllPackuments = makeAllPackumentsFetcher(noopLogger);
  return { getAllPackuments } as const;
}

describe("fetch all packuments", () => {
  it("should fail on non-auth error response", async () => {
    const expected = {
      message: "Idk, it failed",
      name: "FakeError",
      statusCode: 500,
    } as HttpErrorBase;
    jest.mocked(npmFetch.json).mockRejectedValue(expected);
    const { getAllPackuments } = makeDependencies();

    const result = await getAllPackuments(exampleRegistry).promise;

    expect(result).toBeError((actual) =>
      expect(actual).toBeInstanceOf(GenericNetworkError)
    );
  });

  it("should fail on auth error response", async () => {
    const expected = {
      message: "Idk, it failed",
      name: "FakeError",
      statusCode: 401,
    } as HttpErrorBase;
    jest.mocked(npmFetch.json).mockRejectedValue(expected);
    const { getAllPackuments } = makeDependencies();

    const result = await getAllPackuments(exampleRegistry).promise;

    expect(result).toBeError((actual) =>
      expect(actual).toBeInstanceOf(RegistryAuthenticationError)
    );
  });

  it("should succeed on ok response", async () => {
    const expected = {
      _update: 123,
    };
    jest.mocked(npmFetch.json).mockResolvedValue(expected);
    const { getAllPackuments } = makeDependencies();

    const result = await getAllPackuments(exampleRegistry).promise;

    expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
  });
});
