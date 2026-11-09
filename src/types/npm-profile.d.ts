// @types/npm-profile describes an old api where loginCouch also took an email.
// Only the parts we use are declared here.
declare module "npm-profile" {
  import type { Options } from "npm-registry-fetch";

  /**
   * Logs in to a registry using the legacy CouchDB api.
   * @param username The users name.
   * @param password The users password.
   * @param opts Fetch options, such as the registry to log in to.
   * @returns An object containing the users new auth token.
   */
  export function loginCouch(
    username: string,
    password: string,
    opts?: Options
  ): Promise<{ token: string; username: string }>;
}
