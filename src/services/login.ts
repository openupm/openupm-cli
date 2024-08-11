import { RegistryUrl } from "../domain/registry-url";
import { PutRegistryAuth } from "./put-registry-auth";
import { NpmLogin } from "./npm-login";
import { AuthNpmrc } from "./npmrc-auth";
import { DebugLog } from "../logging";
import { NpmAuth } from "another-npm-registry-client";

/**
 * Function for logging in a user to a npm registry. Supports both basic and
 * token-based authentication.
 * @param username The username with which to login.
 * @param password The password with which to login.
 * @param email The email with which to login.
 * @param alwaysAuth Whether to always authenticate.
 * @param registry The url of the npm registry with which to authenticate.
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
 * Makes a {@link Login} function.
 */
export function makeLogin(
  putRegistryAuth: PutRegistryAuth,
  npmLogin: NpmLogin,
  authNpmrc: AuthNpmrc,
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
    const token = await npmLogin(registry, username, email, password);
    debugLog(`npm login successful`);

    const auth: NpmAuth = { token, email, alwaysAuth };
    await putRegistryAuth(configPath, registry, auth);

    const npmrcPath = await authNpmrc(registry, token);
    debugLog(`saved to npm config: ${npmrcPath}`);
  };
}
