import { promisify } from "util";
import RegClient, {
  AddUserParams,
  AddUserResponse,
  ClientCallback,
  GetParams,
} from "another-npm-registry-client";
import log from "./logger";
import request from "request";
import { AssertionError } from "assert";

export type NpmClient = {
  rawClient: RegClient;
  /**
   * @throws {NpmClientError}
   */
  get(uri: string, options: GetParams): Promise<PkgInfo>;
  /**
   * @throws {NpmClientError}
   */
  adduser(uri: string, options: AddUserParams): Promise<AddUserResponse>;
};

export class NpmClientError extends Error {
  cause: Error;
  response: request.Response;

  constructor(cause: Error, response: request.Response) {
    super(
      cause?.message ??
        "An error occurred while interacting with an Npm registry"
    );
    this.name = "NpmClientError";
    this.cause = cause;
    this.response = response;
  }
}

export function assertIsNpmClientError(
  x: unknown
): asserts x is NpmClientError {
  if (!(x instanceof NpmClientError))
    throw new AssertionError({
      message: "Given object was not an NpmClientError",
      actual: x,
    });
}

/**
 * Normalizes a RegClient function. Specifically it merges it's multiple
 * callback arguments into a single NormalizedError object. This function
 * also takes care of binding and promisifying.
 */
function normalizeClientFunction<TParam, TData>(
  client: RegClient,
  fn: (uri: string, params: TParam, cb: ClientCallback<TData>) => void
): (uri: string, params: TParam) => Promise<TData> {
  const bound = fn.bind(client);
  const withNormalizedError = (
    uri: string,
    params: TParam,
    cb: (error: NpmClientError | null, data: TData) => void
  ) => {
    return bound(uri, params, (error, data, raw, res) => {
      cb(error !== null ? new NpmClientError(error, res) : null, data);
    });
  };
  return promisify(withNormalizedError);
}

/**
 * Return npm client
 */
export const getNpmClient = (): NpmClient => {
  // create client
  const client = new RegClient({ log });
  return {
    // The instance of raw npm client
    rawClient: client,
    // Promisified methods
    get: normalizeClientFunction(client, client.get),
    adduser: normalizeClientFunction(client, client.adduser),
  };
};
