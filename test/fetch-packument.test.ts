import { buildPackument } from "./data-packument";
import { makeFetchPackumentService } from "../src/services/fetch-packument";
import { UnityPackument } from "../src/domain/packument";
import { HttpErrorBase } from "npm-registry-fetch";
import { makeDomainName } from "../src/domain/domain-name";
import RegClient from "another-npm-registry-client";
import { Registry } from "../src/domain/registry";
import { exampleRegistryUrl } from "./data-registry";

jest.mock("another-npm-registry-client");

const packageA = makeDomainName("package-a");
const exampleRegistry: Registry = {
  url: exampleRegistryUrl,
  auth: null,
};

function makeDependencies() {
  const regClient: jest.Mocked<RegClient.Instance> = {
    adduser: jest.fn(),
    get: jest.fn(),
  };

  const fetchPackument = makeFetchPackumentService(regClient);
  return [fetchPackument, regClient] as const;
}

function mockRegClientGetResult(
  regClient: jest.Mocked<RegClient.Instance>,
  error: HttpErrorBase | null,
  packument: UnityPackument | null
) {
  regClient.get.mockImplementation((_1, _2, cb) => {
    cb(error, packument!, null!, null!);
  });
}

describe("fetch packument service", () => {
  it("should get existing packument", async () => {
    // TODO: Use prop test
    const packument = buildPackument(packageA);
    const [fetchPackument, regClient] = makeDependencies();
    mockRegClientGetResult(regClient, null, packument);

    const result = await fetchPackument(exampleRegistry, packageA).promise;

    expect(result).toBeOk((actual) => expect(actual).toEqual(packument));
  });

  it("should not find unknown packument", async () => {
    const [fetchPackument, regClient] = makeDependencies();
    mockRegClientGetResult(
      regClient,
      {
        message: "not found",
        name: "FakeError",
        statusCode: 404,
      } as HttpErrorBase,
      null
    );

    const result = await fetchPackument(exampleRegistry, packageA).promise;

    expect(result).toBeOk((actual) => expect(actual).toBeNull());
  });

  it("should fail for errors", async () => {
    const [fetchPackument, regClient] = makeDependencies();
    mockRegClientGetResult(
      regClient,
      {
        message: "Unauthorized",
        name: "FakeError",
        statusCode: 401,
      } as HttpErrorBase,
      null
    );

    const result = await fetchPackument(exampleRegistry, packageA).promise;

    expect(result).toBeError();
  });
});
