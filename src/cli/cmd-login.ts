import { AuthenticationError, makeAddUserService } from "../services/add-user";
import log from "./logger";
import {
  GetUpmConfigDirError,
  tryGetUpmConfigDir,
  tryStoreUpmAuth,
  UpmAuthStoreError,
} from "../io/upm-config-io";
import { EnvParseError, parseEnv } from "../utils/env";
import { BasicAuth, encodeBasicAuth, TokenAuth } from "../domain/upm-config";
import { coerceRegistryUrl } from "../domain/registry-url";
import {
  promptEmail,
  promptPassword,
  promptRegistryUrl,
  promptUsername,
} from "./prompts";
import { CmdOptions } from "./options";
import { Ok, Result } from "ts-results-es";
import { NpmrcLoadError, NpmrcSaveError } from "../io/npmrc-io";
import { makeNpmrcAuthService } from "../services/npmrc-auth";

/**
 * Errors which may occur when logging in.
 */
export type LoginError =
  | EnvParseError
  | GetUpmConfigDirError
  | AuthenticationError
  | NpmrcLoadError
  | NpmrcSaveError
  | UpmAuthStoreError;

/**
 * Options for logging in a user. These come from the CLI.
 * All properties are optional. If missing they will either be prompted
 * from the user or get default values.
 */
export type LoginOptions = CmdOptions<{
  username?: string;
  password?: string;
  email?: string;
  basicAuth?: boolean;
  alwaysAuth?: boolean;
}>;

/**
 * Attempts to log in a user into a npm-registry.
 * @param options Options for logging in.
 */
export const login = async function (
  options: LoginOptions
): Promise<Result<void, LoginError>> {
  // Create services
  const npmrcAuthService = makeNpmrcAuthService();

  // parse env
  const envResult = await parseEnv(options);
  if (envResult.isErr()) return envResult;
  const env = envResult.value;

  // query parameters
  const username = options.username ?? (await promptUsername());
  const password = options.password ?? (await promptPassword());
  const email = options.email ?? (await promptEmail());

  const loginRegistry =
    options._global.registry !== undefined
      ? coerceRegistryUrl(options._global.registry)
      : await promptRegistryUrl();

  const alwaysAuth = options.alwaysAuth || false;

  const configDirResult = await tryGetUpmConfigDir(env.wsl, env.systemUser)
    .promise;
  if (configDirResult.isErr()) return configDirResult;
  const configDir = configDirResult.value;

  if (options.basicAuth) {
    // basic auth
    const _auth = encodeBasicAuth(username, password);
    const result = await tryStoreUpmAuth(configDir, loginRegistry, {
      email,
      alwaysAuth,
      _auth,
    } satisfies BasicAuth).promise;
    if (result.isErr()) return result;
  } else {
    // npm login
    const addUserService = makeAddUserService();
    const loginResult = await addUserService.tryAdd(
      loginRegistry,
      username,
      password,
      email
    ).promise;
    if (loginResult.isErr()) {
      if (loginResult.error.status === 401)
        log.warn("401", "Incorrect username or password");
      else
        log.error(
          loginResult.error.status.toString(),
          loginResult.error.message
        );
      return loginResult;
    }
    log.notice("auth", `you are authenticated as '${username}'`);
    const token = loginResult.value;

    // write npm token
    const updateResult = await npmrcAuthService.trySetAuthToken(
      loginRegistry,
      token
    ).promise;
    if (updateResult.isErr()) return updateResult;
    updateResult.map((configPath) =>
      log.notice("config", `saved to npm config: ${configPath}`)
    );

    const storeResult = await tryStoreUpmAuth(configDir, loginRegistry, {
      email,
      alwaysAuth,
      token,
    } satisfies TokenAuth).promise;
    if (storeResult.isErr()) return storeResult;
  }

  return Ok(undefined);
};
