import "assert";
import {
  AuthenticationError,
  makeAddUserService,
} from "../../src/services/add-user";
import RegClient from "another-npm-registry-client";
import { HttpErrorBase } from "npm-registry-fetch";
import { exampleRegistryUrl } from "../domain/data-registry";
import { mockRegClientAddUserResult } from "./registry-client.mock";

function makeDependencies() {
  const registryClient: jest.Mocked<RegClient.Instance> = {
    adduser: jest.fn(),
    get: jest.fn(),
  };

  const addUser = makeAddUserService(registryClient);
  return { addUser, registryClient } as const;
}

describe("add-user-service", () => {
  it("should give token for valid user", async () => {
    const expected = "some token";
    const { addUser, registryClient } = makeDependencies();
    mockRegClientAddUserResult(
      registryClient,
      null,
      {
        ok: true,
        token: expected,
      },
      null
    );

    const result = await addUser(
      exampleRegistryUrl,
      "valid-user",
      "valid@user.com",
      "valid-password"
    ).promise;

    expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
  });

  it("should fail for not-ok response", async () => {
    const { addUser, registryClient } = makeDependencies();
    mockRegClientAddUserResult(
      registryClient,
      null,
      {
        ok: false,
      },
      {
        statusMessage: "bad user",
        statusCode: 401,
      }
    );

    const result = await addUser(
      exampleRegistryUrl,
      "bad-user",
      "bad@user.com",
      "bad-password"
    ).promise;

    expect(result).toBeError((error) =>
      expect(error).toBeInstanceOf(AuthenticationError)
    );
  });

  it("should fail for error response", async () => {
    const { addUser, registryClient } = makeDependencies();
    mockRegClientAddUserResult(registryClient, {} as HttpErrorBase, null, {
      statusMessage: "bad user",
      statusCode: 401,
    });

    const result = await addUser(
      exampleRegistryUrl,
      "bad-user",
      "bad@user.com",
      "bad-password"
    ).promise;

    expect(result).toBeError((error) =>
      expect(error).toBeInstanceOf(AuthenticationError)
    );
  });
});
