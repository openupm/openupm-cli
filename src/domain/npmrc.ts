import path from "path";
import type { AuthToken } from "./auth.js";
import { RegistryUrl } from "./registry-url.js";
import { splitLines } from "./string-utils.js";

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
  token: AuthToken
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

/**
 * Parses the content of a `.npmrc` file.
 * @param content The file content.
 * @returns The parsed content.
 */
export function parseNpmrc(content: string): Npmrc {
  // TODO: Check if lines are valid.
  return splitLines(content);
}

/**
 * Serializes a {@link Npmrc} object so it can be written to a `.npmrc` file.
 * @param eol A string to use for line separators.
 * @param npmrc The npmrc.
 * @returns The file content.
 */
export function serializeNpmrc(eol: string, npmrc: Npmrc): string {
  return npmrc.join(eol);
}
