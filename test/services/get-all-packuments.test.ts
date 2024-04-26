import npmFetch, { HttpErrorBase } from "npm-registry-fetch";
import { makeGetAllPackumentsService } from "../../src/services/get-all-packuments";
import { Registry } from "../../src/domain/registry";
import { exampleRegistryUrl } from "../domain/data-registry";

jest.mock("npm-registry-fetch");

const exampleRegistry: Registry = {
  url: exampleRegistryUrl,
  auth: null,
};

function makeDependencies() {
  const getAllPackuments = makeGetAllPackumentsService();
  return { getAllPackuments } as const;
}

describe("get all packuments service", () => {
  it("should fail on error response", async () => {
    const expected = {
      message: "Idk, it failed",
      name: "FakeError",
      statusCode: 500,
    } as HttpErrorBase;
    jest.mocked(npmFetch.json).mockRejectedValue(expected);
    const { getAllPackuments } = makeDependencies();

    const result = await getAllPackuments(exampleRegistry).promise;

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
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
