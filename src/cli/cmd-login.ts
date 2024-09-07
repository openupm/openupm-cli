import { Logger } from "npmlog";
import { loginUsing } from "../app/login";
import { coerceRegistryUrl } from "../domain/registry-url";
import { getUserUpmConfigPathFor } from "../domain/upm-config";
import type { GetAuthToken } from "../io/get-auth-token";
import { getHomePathFromEnv } from "../io/special-paths";
import type { ReadTextFile, WriteTextFile } from "../io/text-file-io";
import type { DebugLog } from "../domain/logging";
import { partialApply } from "../domain/fp-utils";
import { CmdOptions } from "./options";
import { parseEnvUsing } from "./parse-env";
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
  homePath: string,
  getAuthToken: GetAuthToken,
  readTextFile: ReadTextFile,
  writeTextFile: WriteTextFile,
  debugLog: DebugLog,
  log: Logger
): LoginCmd {
  const login = partialApply(
    loginUsing,
    homePath,
    getAuthToken,
    readTextFile,
    writeTextFile,
    debugLog
  );

  return async (options) => {
    // parse env
    const env = await parseEnvUsing(log, process.env, process.cwd(), options);

    const homePath = getHomePathFromEnv(process.env);
    const upmConfigPath = getUserUpmConfigPathFor(
      process.env,
      homePath,
      env.systemUser
    );

    // query parameters
    const username = options.username ?? (await promptUsername());
    const password = options.password ?? (await promptPassword());
    const email = options.email ?? (await promptEmail());

    const loginRegistry =
      options.registry !== undefined
        ? coerceRegistryUrl(options.registry)
        : await promptRegistryUrl();

    const alwaysAuth = options.alwaysAuth || false;

    await login(
      username,
      password,
      email,
      alwaysAuth,
      loginRegistry,
      upmConfigPath,
      options.basicAuth ? "basic" : "token"
    );

    log.notice("auth", `you are authenticated as '${username}'`);
    log.notice("config", "saved unity config at " + upmConfigPath);
    return ResultCodes.Ok;
  };
}
