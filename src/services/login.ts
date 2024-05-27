import { AsyncResult } from "ts-results-es";
import { BasicAuth, encodeBasicAuth, TokenAuth } from "../domain/upm-config";
import { RegistryUrl } from "../domain/registry-url";
import { SaveAuthToUpmConfig, UpmAuthStoreError } from "./upm-auth";
import { NpmLoginError, NpmLoginService } from "./npm-login";
import { AuthNpmrcService, NpmrcAuthTokenUpdateError } from "./npmrc-auth";
import { DebugLog } from "../logging";

/**
 * Error which may occur when logging in a user.
 */
export type LoginError =
  | UpmAuthStoreError
  | NpmLoginError
  | NpmrcAuthTokenUpdateError;

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
 * @param onNpmAuthSuccess Callback that notifies when authentication
 * with the npm registry was successful. Only called with token-based
 * authentication.
 * @param onNpmrcUpdated Callback that notifies when the .npmrc file was
 * updated. Only called with token-based authentication.
 */
export type LoginService = (
  username: string,
  password: string,
  email: string,
  alwaysAuth: boolean,
  registry: RegistryUrl,
  configPath: string,
  authMode: "basic" | "token"
) => AsyncResult<void, LoginError>;

/**
 * Makes a {@link LoginService} function.
 */
export function makeLoginService(
  saveAuthToUpmConfig: SaveAuthToUpmConfig,
  npmLogin: NpmLoginService,
  authNpmrc: AuthNpmrcService,
  debugLog: DebugLog
): LoginService {
  return (
    username,
    password,
    email,
    alwaysAuth,
    registry,
    configPath,
    authMode
  ) => {
    if (authMode === "basic") {
      // basic auth
      const _auth = encodeBasicAuth(username, password);
      return saveAuthToUpmConfig(configPath, registry, {
        email,
        alwaysAuth,
        _auth,
      } satisfies BasicAuth);
    }

    // npm login
    return npmLogin(registry, username, password, email).andThen((token) => {
      debugLog(`npm login successful`);
      // write npm token
      return authNpmrc(registry, token).andThen((npmrcPath) => {
        debugLog(`saved to npm config: ${npmrcPath}`);
        // Save config
        return saveAuthToUpmConfig(configPath, registry, {
          email,
          alwaysAuth,
          token,
        } satisfies TokenAuth);
      });
    });
  };
}
