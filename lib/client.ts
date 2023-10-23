import { promisify } from "util";
import RegClient, {
  GetParams,
  AddUserParams,
  AddUserResponse,
} from "another-npm-registry-client";
import log from "./logger";

export type NpmClient = {
  rawClient: RegClient;
  get(uri: string, options: GetParams): Promise<PkgInfo>;
  adduser(uri: string, options: AddUserParams): Promise<AddUserResponse>;
};

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
    get: promisify(client.get.bind(client)),
    adduser: promisify(client.adduser.bind(client)),
  };
};
