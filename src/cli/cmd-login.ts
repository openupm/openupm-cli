import { AuthenticationError } from "../services/npm-login";
import { GetUpmConfigPath, GetUpmConfigPathError } from "../io/upm-config-io";
import { EnvParseError, ParseEnvService } from "../services/parse-env";
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
import { Logger } from "npmlog";
import { UpmAuthStoreError } from "../services/upm-auth";
import { LoginService } from "../services/login";
import { logEnvParseError } from "./error-logging";

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
  getUpmConfigPath: GetUpmConfigPath,
  login: LoginService,
  log: Logger
): LoginCmd {
  return async (options) => {
    // parse env
    const envResult = await parseEnv(options);
    if (envResult.isErr()) {
      logEnvParseError(log, envResult.error);
      return envResult;
    }
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

    const loginResult = await login(
      username,
      password,
      email,
      alwaysAuth,
      loginRegistry,
      configPath,
      options.basicAuth ? "basic" : "token",
      () => log.notice("auth", `you are authenticated as '${username}'`),
      (npmrcPath) => log.notice("config", `saved to npm config: ${npmrcPath}`)
    ).promise;

    if (loginResult.isErr()) {
      const loginError = loginResult.error;
      if (loginError instanceof AuthenticationError) {
        if (loginError.status === 401)
          log.warn("401", "Incorrect username or password");
        else log.error(loginError.status.toString(), loginError.message);
      }

      return loginResult;
    }

    log.notice("config", "saved unity config at " + configPath);
    return Ok(undefined);
  };
}
