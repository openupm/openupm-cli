import { NpmAuth } from "another-npm-registry-client";
import { RegistryUrl } from "../domain/registry-url";
import { DebugLog, npmDebugLog } from "../logging";
import { getAuthToken, GetAuthToken } from "./get-auth-token";
import { putNpmAuthToken, StoreNpmAuthToken } from "./put-npm-auth-token";
import { putRegistryAuth, PutRegistryAuth } from "./put-registry-auth";

/**
 * Function for logging in a user to a package registry. Supports both basic and
 * token-based authentication.
 * @param username The username with which to login.
 * @param password The password with which to login.
 * @param email The email with which to login.
 * @param alwaysAuth Whether to always authenticate.
 * @param registry The url of the registry with which to authenticate.
 * @param configPath Path of the upm-config file in which to store
 * authentication information.
 * @param authMode Whether to use basic or token-based authentication.
 */
export type Login = (
  username: string,
  password: string,
  email: string,
  alwaysAuth: boolean,
  registry: RegistryUrl,
  configPath: string,
  authMode: "basic" | "token"
) => Promise<void>;

/**
 * Makes a {@link Login} function which writes the authentication information
 * into the users upm config.
 */
export function UpmConfigLogin(
  putRegistryAuth: PutRegistryAuth,
  getAuthToken: GetAuthToken,
  putNpmAuthToken: StoreNpmAuthToken,
  debugLog: DebugLog
): Login {
  return async (
    username,
    password,
    email,
    alwaysAuth,
    registry,
    configPath,
    authMode
  ) => {
    if (authMode === "basic") {
      const auth: NpmAuth = { username, password, email, alwaysAuth };
      return await putRegistryAuth(configPath, registry, auth);
    }

    // npm login
    const token = await getAuthToken(registry, username, email, password);
    debugLog(`npm login successful`);

    const auth: NpmAuth = { token, email, alwaysAuth };
    await putRegistryAuth(configPath, registry, auth);

    const npmrcPath = await putNpmAuthToken(registry, token);
    debugLog(`saved to npm config: ${npmrcPath}`);
  };
}

/**
 * Default {@link Login} function. Uses {@link UpmConfigLogin}.
 */
export const login = UpmConfigLogin(
  putRegistryAuth,
  getAuthToken,
  putNpmAuthToken,
  npmDebugLog
);
