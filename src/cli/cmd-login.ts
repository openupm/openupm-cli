import { Logger } from "npmlog";
import { coerceRegistryUrl } from "../domain/registry-url";
import { GetUpmConfigPath } from "../io/upm-config-io";
import { Login } from "../services/login";
import { ParseEnv } from "../services/parse-env";
import { CmdOptions } from "./options";
import {
  promptEmail,
  promptPassword,
  promptRegistryUrl,
  promptUsername,
} from "./prompts";
import { ResultCodes } from "./result-codes";

/**
 * Options for logging in a user. These come from the CLI.
 * All properties are optional. If missing they will either be prompted
 * from the user or get default values.
 */
export type LoginOptions = CmdOptions<{
  /**
   * The username to log in with.
   */
  username?: string;
  /**
   * The password to log in with.
   */
  password?: string;
  /**
   * The email to log in with.
   */
  email?: string;
  /**
   * Whether to use basic or token-based authentication.
   */
  basicAuth?: boolean;
  /**
   * Whether to always authenticate.
   */
  alwaysAuth?: boolean;
}>;

/**
 * The possible result codes with which the login command can exit.
 */
export type LoginResultCode = ResultCodes.Ok | ResultCodes.Error;

/**
 * Cmd-handler for logging in users.
 * @param options Options for logging in.
 */
export type LoginCmd = (options: LoginOptions) => Promise<LoginResultCode>;

/**
 * Makes a {@link LoginCmd} function.
 */
export function makeLoginCmd(
  parseEnv: ParseEnv,
  getUpmConfigPath: GetUpmConfigPath,
  login: Login,
  log: Logger
): LoginCmd {
  return async (options) => {
    // parse env
    const env = await parseEnv(options);

    // query parameters
    const username = options.username ?? (await promptUsername());
    const password = options.password ?? (await promptPassword());
    const email = options.email ?? (await promptEmail());

    const loginRegistry =
      options.registry !== undefined
        ? coerceRegistryUrl(options.registry)
        : await promptRegistryUrl();

    const alwaysAuth = options.alwaysAuth || false;

    const configPath = await getUpmConfigPath(env.systemUser);

    await login(
      username,
      password,
      email,
      alwaysAuth,
      loginRegistry,
      configPath,
      options.basicAuth ? "basic" : "token"
    );

    log.notice("auth", `you are authenticated as '${username}'`);
    log.notice("config", "saved unity config at " + configPath);
    return ResultCodes.Ok;
  };
}
