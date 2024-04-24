import RegClient, { AddUserResponse } from "another-npm-registry-client";
import { UnityPackument } from "../../src/domain/packument";
import { HttpErrorBase } from "npm-registry-fetch";
import { Response } from "request";

export function mockRegClientGetResult(
  regClient: jest.Mocked<RegClient.Instance>,
  error: HttpErrorBase | null,
  packument: UnityPackument | null
) {
  regClient.get.mockImplementation((_1, _2, cb) => {
    cb(error, packument!, null!, null!);
  });
}

export function mockRegClientAddUserResult(
  registryClient: jest.Mocked<RegClient.Instance>,
  error: HttpErrorBase | null,
  responseData: AddUserResponse | null,
  response: Pick<Response, "statusMessage" | "statusCode"> | null
) {
  registryClient.adduser.mockImplementation((_1, _2, cb) =>
    cb(error, responseData!, null!, response! as Response)
  );
}
