import { AuthenticationError, NpmLoginService } from "../services/npm-login";
import { GetUpmConfigPath, GetUpmConfigPathError } from "../io/upm-config-io";
import { EnvParseError, ParseEnvService } from "../services/parse-env";
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
import { AuthNpmrcService } from "../services/npmrc-auth";
import { Logger } from "npmlog";
import { SaveAuthToUpmConfig, UpmAuthStoreError } from "../services/upm-auth";

/**
 * Errors which may occur when logging in.
 */
export type LoginError =
  | EnvParseError
  | GetUpmConfigPathError
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
 * Cmd-handler for logging in users.
 * @param options Options for logging in.
 */
export type LoginCmd = (
  options: LoginOptions
) => Promise<Result<void, LoginError>>;

/**
 * Makes a {@link LoginCmd} function.
 */
export function makeLoginCmd(
  parseEnv: ParseEnvService,
  authNpmrc: AuthNpmrcService,
  npmLogin: NpmLoginService,
  getUpmConfigPath: GetUpmConfigPath,
  saveAuthToUpmConfig: SaveAuthToUpmConfig,
  log: Logger
): LoginCmd {
  return async (options) => {
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

    const configPathResult = await getUpmConfigPath(env.wsl, env.systemUser)
      .promise;
    if (configPathResult.isErr()) return configPathResult;
    const configPath = configPathResult.value;

    if (options.basicAuth) {
      // basic auth
      const _auth = encodeBasicAuth(username, password);
      const result = await saveAuthToUpmConfig(configPath, loginRegistry, {
        email,
        alwaysAuth,
        _auth,
      } satisfies BasicAuth).promise;
      if (result.isErr()) return result;
      log.notice("config", "saved unity config at " + result.value);
    } else {
      // npm login
      const loginResult = await npmLogin(
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
      const updateResult = await authNpmrc(loginRegistry, token).promise;
      if (updateResult.isErr()) return updateResult;
      updateResult.map((configPath) =>
        log.notice("config", `saved to npm config: ${configPath}`)
      );

      const storeResult = await saveAuthToUpmConfig(configPath, loginRegistry, {
        email,
        alwaysAuth,
        token,
      } satisfies TokenAuth).promise;
      if (storeResult.isErr()) return storeResult;
      log.notice("config", "saved unity config at " + storeResult.value);
    }

    return Ok(undefined);
  };
}
