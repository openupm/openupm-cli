import {promisify} from "util";

// @ts-ignore
import RegClient from "another-npm-registry-client";
import log from "./logger";


/**
 * Return npm client
 */
export const getNpmClient = function() {
  // create client
  const client = new RegClient({ log });
  return {
    // The instance of raw npm client
    rawClient: client,
    // Promisified methods
    get: promisify(client.get.bind(client)),
    adduser: promisify(client.adduser.bind(client))
  };
};
