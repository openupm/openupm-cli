import path from "path";
import { RegistryUrl } from "./registry-url";

/**
 * The content lines of a npmrc file.
 */
export type Npmrc = ReadonlyArray<string>;

/**
 * An empty npmrc (No lines).
 */
export const emptyNpmrc: Npmrc = [];

/**
 * Gets the `.npmrc` path for a user.
 * @param homePath The users home directory.
 * @returns The path to the `.npmrc` file.
 */
export const getHomeNpmrcPath = (homePath: string): string =>
  path.join(homePath, ".npmrc");

/**
 * Adds or updates the auth-token for a registry.
 * @param npmrc The current npmrc.
 * @param registry The registry to set the token for.
 * @param token The token.
 */
export function setToken(
  npmrc: Npmrc,
  registry: RegistryUrl,
  token: string
): Npmrc {
  let lines = [...npmrc];
  const quotes = /[?=]/.test(token) ? '"' : "";
  // get the registry url without http protocol
  let registryUrl = registry.slice(registry.search(/:\/\//) + 1);
  // add trailing slash
  if (!registryUrl.endsWith("/")) registryUrl = registryUrl + "/";
  const index = lines.findIndex(function (element, index) {
    if (element.indexOf(registryUrl + ":_authToken=") !== -1) {
      // If an entry for the auth token is found, replace it
      lines[index] = element.replace(
        /authToken=.*/,
        "authToken=" + quotes + token + quotes
      );
      return true;
    }
    return false;
  });
  // If no entry for the auth token is found, add one
  if (index === -1) {
    lines.push(registryUrl + ":_authToken=" + quotes + token + quotes);
  }
  // Remove empty lines
  lines = lines.filter((l) => l);
  return lines;
}
