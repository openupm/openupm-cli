import "assert";
import RegClient from "another-npm-registry-client";
import { exampleRegistryUrl } from "../../common/data-registry";
import { mockRegClientAddUserResult } from "./registry-client.mock";
import { RegistryAuthenticationError } from "../../../src/io/common-errors";
import { noopLogger } from "../../../src/logging";
import { getAuthTokenUsing } from "../../../src/io/get-auth-token";

describe("authenticate user with npm registry", () => {
  function makeDependencies() {
    const registryClient: jest.Mocked<RegClient.Instance> = {
      adduser: jest.fn(),
      get: jest.fn(),
    };

    const authenticateUserWithNpmRegistry = getAuthTokenUsing(
      registryClient,
      noopLogger
    );
    return { authenticateUserWithNpmRegistry, registryClient } as const;
  }
  it("should give token for valid user", async () => {
    const expected = "some token";
    const { authenticateUserWithNpmRegistry, registryClient } =
      makeDependencies();
    mockRegClientAddUserResult(
      registryClient,
      null,
      {
        ok: true,
        token: expected,
      },
      null
    );

    const actual = await authenticateUserWithNpmRegistry(
      exampleRegistryUrl,
      "valid-user",
      "valid@user.com",
      "valid-password"
    );

    expect(actual).toEqual(expected);
  });

  it("should fail for not-ok response", async () => {
    const { authenticateUserWithNpmRegistry, registryClient } =
      makeDependencies();
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
      authenticateUserWithNpmRegistry(
        exampleRegistryUrl,
        "bad-user",
        "bad@user.com",
        "bad-password"
      )
    ).rejects.toBeInstanceOf(RegistryAuthenticationError);
  });

  it("should fail for error response", async () => {
    const { authenticateUserWithNpmRegistry, registryClient } =
      makeDependencies();
    mockRegClientAddUserResult(
      registryClient,
      new Error(),
      { ok: false },
      {
        statusMessage: "bad user",
        statusCode: 401,
      }
    );

    await expect(
      authenticateUserWithNpmRegistry(
        exampleRegistryUrl,
        "bad-user",
        "bad@user.com",
        "bad-password"
      )
    ).rejects.toBeInstanceOf(RegistryAuthenticationError);
  });
});
