declare module "another-npm-registry-client" {
  import { type Response } from "request";

  type NpmAuth =
    | {
        username: string;
        password: string;
        email: string;
        alwaysAuth?: boolean;
      }
    | { token: string; alwaysAuth?: boolean };

  type AddUserParams = { auth: NpmAuth };

  type GetParams = {
    timeout?: number;
    follow?: boolean;
    staleOk?: boolean;
    auth?: NpmAuth;
    fullMetadata?: boolean;
  };

  type AddUserResponse = { ok: true; token: string } | { ok: false };

  type ClientCallback<TData> = (
    error: Error | null,
    data: TData,
    raw: string,
    res: Response
  ) => void;

  type Instance = {
    get(
      uri: string,
      params: GetParams,
      cb: ClientCallback<import("../domain/packument").UnityPackument>
    ): void;
    adduser(
      uri: string,
      params: AddUserParams,
      cb: ClientCallback<AddUserResponse>
    ): void;
  };
}

declare module "another-npm-registry-client" {
  const RegClient: new (this: Instance, config?: { log: unknown }) => Instance;
  export = RegClient;
}
