import { Registry } from "./global";
import { trySplitAtFirstOccurrenceOf } from "../utils/string-utils";
import { Brand } from "ts-brand";

export type Base64AuthData = Brand<string, "Base64AuthData">;

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
  _auth: Base64AuthData;
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
  npmAuth?: Record<Registry, UpmAuth>;
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
export function encodeBasicAuth(
  username: string,
  password: string
): Base64AuthData {
  return Buffer.from(`${username}:${password}`).toString(
    "base64"
  ) as Base64AuthData;
}

/**
 * Decodes a base64 encoded username and password
 * @param base64 The base64 string
 * @throws Error if the string cannot be decoded
 */
export function decodeBasicAuth(base64: Base64AuthData): [string, string] {
  const buffer = Buffer.from(base64, "base64");
  const text = buffer.toString("utf-8");
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
