import "assert";
import { makeNpmLogin } from "../../src/services/npm-login";
import RegClient from "another-npm-registry-client";
import { HttpErrorBase } from "npm-registry-fetch/lib/errors";
import { exampleRegistryUrl } from "../domain/data-registry";
import { mockRegClientAddUserResult } from "./registry-client.mock";
import { RegistryAuthenticationError } from "../../src/io/common-errors";
import { noopLogger } from "../../src/logging";

function makeDependencies() {
  const registryClient: jest.Mocked<RegClient.Instance> = {
    adduser: jest.fn(),
    get: jest.fn(),
  };

  const addUser = makeNpmLogin(registryClient, noopLogger);
  return { addUser, registryClient } as const;
}

describe("npm-login service", () => {
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

    const actual = await addUser(
      exampleRegistryUrl,
      "valid-user",
      "valid@user.com",
      "valid-password"
    );

    expect(actual).toEqual(expected);
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

    await expect(
      addUser(exampleRegistryUrl, "bad-user", "bad@user.com", "bad-password")
    ).rejects.toBeInstanceOf(RegistryAuthenticationError);
  });

  it("should fail for error response", async () => {
    const { addUser, registryClient } = makeDependencies();
    mockRegClientAddUserResult(
      registryClient,
      {} as HttpErrorBase,
      { ok: false },
      {
        statusMessage: "bad user",
        statusCode: 401,
      }
    );

    await expect(
      addUser(exampleRegistryUrl, "bad-user", "bad@user.com", "bad-password")
    ).rejects.toBeInstanceOf(RegistryAuthenticationError);
  });
});
