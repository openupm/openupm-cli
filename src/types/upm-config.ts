import { trySplitAtFirstOccurrenceOf } from "../utils/string-utils";
import { Base64, decodeBase64, encodeBase64 } from "./base64";
import { RegistryUrl } from "./registry-url";

/**
 * Authentication information that is shared between different authentication methods
 */
type AuthBase = {
  /**
   * The email to use
   */
  email: string;
  /**
   * Whether to always authenticate
   */
  alwaysAuth?: boolean;
};

/**
 * Authenticates using encoded username and password
 */
export type BasicAuth = AuthBase & {
  /**
   * Base64 encoded username and password to authenticate with
   */
  _auth: Base64;
};

/**
 * Authenticates using token
 */
export type TokenAuth = AuthBase & {
  /**
   * A token to authenticate with
   */
  token: string;
};

/**
 * Authentication information for a registry
 */
export type UpmAuth = BasicAuth | TokenAuth;

/**
 * Content of .upmconfig.toml. Used to authenticate with package registries
 * @see https://medium.com/openupm/how-to-authenticate-with-a-upm-scoped-registry-using-cli-afc29c13a2f8
 */
export type UPMConfig = {
  /**
   * Authentication information organized by the registry they should be used on
   */
  npmAuth?: Record<RegistryUrl, UpmAuth>;
};

/**
 * Checks if an auth-object uses basic authentication
 * @param auth The auth-object
 */
export function isBasicAuth(auth: UpmAuth): auth is BasicAuth {
  return "_auth" in auth;
}
/**
 * Checks if an auth-object uses token authentication
 * @param auth The auth-object
 */
export function isTokenAuth(auth: UpmAuth): auth is TokenAuth {
  return "token" in auth;
}

/**
 * Encodes a username and password using base64
 * @param username The username
 * @param password The password
 */
export function encodeBasicAuth(username: string, password: string): Base64 {
  return encodeBase64(`${username}:${password}`);
}

/**
 * Decodes a base64 encoded username and password
 * @param base64 The base64 string
 * @throws Error if the string cannot be decoded
 */
export function decodeBasicAuth(base64: Base64): [string, string] {
  const text = decodeBase64(base64);
  const [username, password] = trySplitAtFirstOccurrenceOf(text, ":");
  if (password === undefined) throw new Error("Base64 had invalid format");
  return [username, password];
}

/**
 * Checks if this auth-object should always authenticate
 * @param auth The auth-object
 */
export function shouldAlwaysAuth(auth: UpmAuth): boolean {
  return auth.alwaysAuth || false;
}
