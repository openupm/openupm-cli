import "assert";
import {
  AuthenticationError,
  makeAddUserService,
} from "../src/services/add-user";
import RegClient, { AddUserResponse } from "another-npm-registry-client";
import { HttpErrorBase } from "npm-registry-fetch";
import { Response } from "request";
import { exampleRegistryUrl } from "./data-registry";

jest.mock("another-npm-registry-client");

function mockRegClientAddUserResult(
  error: HttpErrorBase | null,
  responseData: AddUserResponse | null,
  response: Pick<Response, "statusMessage" | "statusCode"> | null
) {
  jest.mocked(RegClient).mockImplementation(() => ({
    adduser: (_1, _2, cb) =>
      cb(error, responseData!, null!, response! as Response),
    get: () => undefined,
  }));
}

describe("add-user-service", () => {
  it("should give token for valid user", async () => {
    const expected = "some token";
    mockRegClientAddUserResult(
      null,
      {
        ok: true,
        token: expected,
      },
      null
    );
    const service = makeAddUserService();

    const result = await service.tryAdd(
      exampleRegistryUrl,
      "valid-user",
      "valid@user.com",
      "valid-password"
    ).promise;

    expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
  });

  it("should fail for not-ok response", async () => {
    mockRegClientAddUserResult(
      null,
      {
        ok: false,
      },
      {
        statusMessage: "bad user",
        statusCode: 401,
      }
    );
    const service = makeAddUserService();

    const result = await service.tryAdd(
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
    mockRegClientAddUserResult({} as HttpErrorBase, null, {
      statusMessage: "bad user",
      statusCode: 401,
    });
    const service = makeAddUserService();

    const result = await service.tryAdd(
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
