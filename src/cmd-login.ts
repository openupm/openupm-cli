import { AuthenticationError, makeNpmClient } from "./npm-client";
import log from "./logger";
import {
  GetUpmConfigDirError,
  tryGetUpmConfigDir,
  tryStoreUpmAuth,
} from "./io/upm-config-io";
import { EnvParseError, parseEnv } from "./utils/env";
import { BasicAuth, encodeBasicAuth, TokenAuth } from "./domain/upm-config";
import { coerceRegistryUrl } from "./domain/registry-url";
import {
  promptEmail,
  promptPassword,
  promptRegistryUrl,
  promptUsername,
} from "./utils/prompts";
import { CmdOptions } from "./types/options";
import { Ok, Result } from "ts-results-es";
import { IOError } from "./common-errors";
import { NpmrcLoadError, NpmrcSaveError } from "./io/npmrc-io";
import { tryUpdateUserNpmrcToken } from "./services/npmrc-token-update-service";

export type LoginError =
  | EnvParseError
  | GetUpmConfigDirError
  | IOError
  | AuthenticationError
  | NpmrcLoadError
  | NpmrcSaveError;

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
    const client = makeNpmClient();
    const loginResult = await client.addUser(
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
    const updateResult = await tryUpdateUserNpmrcToken(loginRegistry, token)
      .promise;
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
