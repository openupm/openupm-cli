import RegClient, { AddUserResponse } from "another-npm-registry-client";
import { Response } from "request";
import { UnityPackument } from "../../src/domain/packument";
import { HttpErrorLike } from "../../src/io/common-errors";

/**
 * Mocks the result of getting a package using a {@link RegClient.Instance}.
 * @param regClient The client.
 * @param error The error returned by the client.
 * @param packument The packument returned by the client.
 */
export function mockRegClientGetResult(
  regClient: jest.Mocked<RegClient.Instance>,
  error: Error | HttpErrorLike | null,
  packument: UnityPackument | null
) {
  regClient.get.mockImplementation((_1, _2, cb) => {
    cb(error, packument!, null!, null!);
  });
}

/**
 * Mocks the result of adding a user using a {@link RegClient.Instance}.
 * @param registryClient The client.
 * @param error The error returned by the request.
 * @param responseData The response data returned by the request.
 * @param response The http response returned by the request.
 */
export function mockRegClientAddUserResult(
  registryClient: jest.Mocked<RegClient.Instance>,
  error: Error | null,
  responseData: AddUserResponse | null,
  response: Pick<Response, "statusMessage" | "statusCode"> | null
) {
  registryClient.adduser.mockImplementation((_1, _2, cb) =>
    cb(error, responseData!, null!, response! as Response)
  );
}
