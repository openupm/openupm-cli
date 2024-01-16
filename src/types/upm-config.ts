import { trySplitAtFirstOccurrenceOf } from "../utils/string-utils";
import { Base64, decodeBase64, encodeBase64 } from "./base64";
import { RegistryUrl } from "./registry-url";
import log from "../logger";
import { NpmAuth } from "another-npm-registry-client";

/**
 * Authentication information that is shared between different authentication methods.
 */
type AuthBase = Readonly<{
  /**
   * The email to use.
   */
  email: string;
  /**
   * Whether to always authenticate.
   */
  alwaysAuth?: boolean;
}>;

/**
 * Authenticates using encoded username and password.
 */
export type BasicAuth = Readonly<
  AuthBase & {
    /**
     * Base64 encoded username and password to authenticate with.
     */
    _auth: Base64;
  }
>;

/**
 * Authenticates using token.
 */
export type TokenAuth = Readonly<
  AuthBase & {
    /**
     * A token to authenticate with.
     */
    token: string;
  }
>;

/**
 * Authentication information for a registry.
 */
export type UpmAuth = BasicAuth | TokenAuth;

/**
 * Content of .upmconfig.toml. Used to authenticate with package registries.
 * @see https://medium.com/openupm/how-to-authenticate-with-a-upm-scoped-registry-using-cli-afc29c13a2f8
 */
export type UPMConfig = Readonly<{
  /**
   * Authentication information organized by the registry they should be used on.
   */
  npmAuth?: Record<string, UpmAuth>;
}>;

/**
 * Checks if an auth-object uses basic authentication.
 * @param auth The auth-object.
 */
export function isBasicAuth(auth: UpmAuth): auth is BasicAuth {
  return "_auth" in auth;
}
/**
 * Checks if an auth-object uses token authentication.
 * @param auth The auth-object.
 */
export function isTokenAuth(auth: UpmAuth): auth is TokenAuth {
  return "token" in auth;
}

/**
 * Encodes a username and password using base64.
 * @param username The username.
 * @param password The password.
 */
export function encodeBasicAuth(username: string, password: string): Base64 {
  return encodeBase64(`${username}:${password}`);
}

/**
 * Decodes a base64 encoded username and password.
 * @param base64 The base64 string.
 * @returns Password/username tuple or null if the decoded string could
 * not be parsed.
 */
export function tryDecodeBasicAuth(base64: Base64): [string, string] | null {
  const text = decodeBase64(base64);
  const [username, password] = trySplitAtFirstOccurrenceOf(text, ":");
  if (password === undefined) return null;
  return [username, password];
}

/**
 * Checks if this auth-object should always authenticate.
 * @param auth The auth-object.
 */
export function shouldAlwaysAuth(auth: UpmAuth): boolean {
  return auth.alwaysAuth || false;
}

/**
 * Attempts to convert a {@link UpmAuth} object to a {@link NpmAuth} object.
 * @param upmAuth The auth-object to convert.
 * @returns The converted object or null, if conversion failed.
 */
export function tryToNpmAuth(upmAuth: UpmAuth): NpmAuth | null {
  if (isTokenAuth(upmAuth)) {
    return {
      token: upmAuth.token,
      alwaysAuth: shouldAlwaysAuth(upmAuth),
    };
  } else if (isBasicAuth(upmAuth)) {
    const decoded = tryDecodeBasicAuth(upmAuth._auth);
    if (decoded === null) return null;
    const [username, password] = decoded;
    return {
      username,
      password: encodeBase64(password),
      email: upmAuth.email,
      alwaysAuth: shouldAlwaysAuth(upmAuth),
    };
  }
  return null;
}

/**
 * Attempts to get the {@link NpmAuth} information for a specific registry
 * from a {@link UPMConfig} object.
 * @param upmConfig The config.
 * @param registry The registry.
 * @returns The auth information or null if the registry does not exist
 * in the config.
 */
export function tryGetAuthForRegistry(
  upmConfig: UPMConfig,
  registry: RegistryUrl
): NpmAuth | null {
  const upmAuth =
    upmConfig.npmAuth?.[registry] ||
    // As a backup search for the registry with trailing slash
    upmConfig.npmAuth?.[registry + "/"];
  if (upmAuth === undefined) return null;
  const npmAuth = tryToNpmAuth(upmAuth);
  if (npmAuth === null) {
    log.warn(
      "env.auth",
      `failed to parse auth info for ${registry} in .upmconfig.toml: missing token or _auth fields`
    );
  }
  return npmAuth;
}

/**
 * Adds authentication information to a {@link UPMConfig} object.
 * @param registry The registry under which to add the auth-information.
 * @param auth The auth-information.
 * @param config The config object that should be extended.
 * @returns An extended {@link UPMConfig} object.
 */
export function addAuth(
  registry: RegistryUrl,
  auth: UpmAuth,
  config: UPMConfig
): UPMConfig {
  const authContainer = config.npmAuth || {};
  return { npmAuth: { ...authContainer, [registry]: auth } };
}
