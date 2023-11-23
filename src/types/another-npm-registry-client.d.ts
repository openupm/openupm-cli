import { PkgInfo } from "./global";
import request from "request";

declare module "another-npm-registry-client" {
  export type NpmAuth =
    | {
        username: string;
        password: string;
        email: string;
        alwaysAuth?: boolean;
      }
    | { token: string; alwaysAuth?: boolean };
  export type AddUserParams = { auth: NpmAuth };

  export type GetParams = {
    timeout?: number;
    follow?: boolean;
    staleOk?: boolean;
    auth?: NpmAuth;
    fullMetadata?: boolean;
  };

  export type AddUserResponse = { ok: true; token: string } | { ok: false };

  export type ClientCallback<TData> = (
    error: Error | null,
    data: TData,
    raw: string,
    res: request.Response
  ) => void;

  export default class RegClient {
    constructor(...args: unknown[]);
    get(uri: string, params: GetParams, cb: ClientCallback<PkgInfo>): void;
    adduser(
      uri: string,
      params: AddUserParams,
      cb: ClientCallback<AddUserResponse>
    ): void;
  }
}
