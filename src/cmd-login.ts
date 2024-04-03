import { AuthenticationError, makeNpmClient } from "./npm-client";
import log from "./logger";
import {
  GetUpmConfigDirError,
  tryGetUpmConfigDir,
  tryStoreUpmAuth,
} from "./io/upm-config-io";
import { EnvParseError, parseEnv } from "./utils/env";
import { BasicAuth, encodeBasicAuth, TokenAuth } from "./domain/upm-config";
import { coerceRegistryUrl, RegistryUrl } from "./domain/registry-url";
import {
  promptEmail,
  promptPassword,
  promptRegistryUrl,
  promptUsername,
} from "./utils/prompts";
import { CmdOptions } from "./types/options";
import { AsyncResult, Ok, Result } from "ts-results-es";
import { IOError } from "./common-errors";
import { tryGetNpmrcPath, tryLoadNpmrc, trySaveNpmrc } from "./io/npmrc-io";
import { emptyNpmrc, setToken } from "./domain/npmrc";

export type LoginError =
  | EnvParseError
  | GetUpmConfigDirError
  | IOError
  | AuthenticationError;

export type LoginOptions = CmdOptions<{
  username?: string;
  password?: string;
  email?: string;
  basicAuth?: boolean;
  alwaysAuth?: boolean;
}>;

/**
 * @throws {Error} An unhandled error occurred.
 */
export const login = async function (
  options: LoginOptions
): Promise<Result<void, LoginError>> {
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
    const result = await npmLogin(username, password, email, loginRegistry)
      .promise;
    if (result.isErr()) return result;
    const token = result.value;

    // write npm token
    await writeNpmToken(loginRegistry, token);
    const storeResult = await tryStoreUpmAuth(configDir, loginRegistry, {
      email,
      alwaysAuth,
      token,
    } satisfies TokenAuth).promise;
    if (storeResult.isErr()) return storeResult;
  }

  return Ok(undefined);
};

/**
 * Return npm login token.
 */
const npmLogin = function (
  username: string,
  password: string,
  email: string,
  registry: RegistryUrl
): AsyncResult<string, AuthenticationError> {
  const client = makeNpmClient();
  return client
    .addUser(registry, username, password, email)
    .map((result) => {
      log.notice("auth", `you are authenticated as '${username}'`);
      return result;
    })
    .mapErr((error) => {
      if (error.status === 401)
        log.warn("401", "Incorrect username or password");
      else log.error(error.status.toString(), error.message);
      return error;
    });
};

/**
 * Write npm token to .npmrc.
 * @throws {Error} An unhandled error occurred.
 */
const writeNpmToken = async function (registry: RegistryUrl, token: string) {
  // read config
  (
    await new AsyncResult(tryGetNpmrcPath()).andThen((configPath) =>
      tryLoadNpmrc(configPath)
        .map((maybeNpmrc) => maybeNpmrc ?? emptyNpmrc)
        .map((npmrc) => setToken(npmrc, registry, token))
        .andThen((npmrc) => trySaveNpmrc(configPath, npmrc))
        .map(() => log.notice("config", `saved to npm config: ${configPath}`))
    ).promise
  ).unwrap();
};
