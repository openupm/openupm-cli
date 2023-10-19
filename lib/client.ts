import { promisify } from "util";
import RegClient from "another-npm-registry-client";
import log from "./logger";

export type NpmClient = {
  rawClient: RegClient;
  get(path: string, options: { auth: Auth }): Promise<PkgInfo>;
  adduser(
    registry: Registry,
    options: { auth: Auth }
  ): Promise<{ ok: boolean | string; token: string }>;
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
