import RegClient from "another-npm-registry-client";
import { Logger } from "npmlog";

/**
 * Client for communicating with the npm registry.
 */
export const makeNpmRegistryClient = (debugLogger: Logger) =>
  new RegClient({ log: debugLogger });
