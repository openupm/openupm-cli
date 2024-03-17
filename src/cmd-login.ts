import fs from "fs";
import path from "path";
import { AuthenticationError, makeNpmClient } from "./npm-client";
import log from "./logger";
import {
  GetUpmConfigDirError,
  tryGetUpmConfigDir,
  tryStoreUpmAuth,
} from "./utils/upm-config-io";
import { EnvParseError, parseEnv } from "./utils/env";
import { BasicAuth, encodeBasicAuth, TokenAuth } from "./types/upm-config";
import { coerceRegistryUrl, RegistryUrl } from "./types/registry-url";
import {
  promptEmail,
  promptPassword,
  promptRegistryUrl,
  promptUsername,
} from "./utils/prompts";
import { CmdOptions } from "./types/options";
import { Ok, Result } from "ts-results-es";
import { IOError } from "./common-errors";

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
  const envResult = await parseEnv(options, true);
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

  const configDirResult = await tryGetUpmConfigDir(env.wsl, env.systemUser);
  if (configDirResult.isErr()) return configDirResult;
  const configDir = configDirResult.value;

  if (options.basicAuth) {
    // basic auth
    const _auth = encodeBasicAuth(username, password);
    const result = await tryStoreUpmAuth(configDir, loginRegistry, {
      email,
      alwaysAuth,
      _auth,
    } satisfies BasicAuth);
    if (result.isErr()) return result;
  } else {
    // npm login
    const result = await npmLogin(username, password, email, loginRegistry);
    if (result.isErr()) return result;
    const token = result.value;

    // write npm token
    await writeNpmToken(loginRegistry, token);
    const storeResult = await tryStoreUpmAuth(configDir, loginRegistry, {
      email,
      alwaysAuth,
      token,
    } satisfies TokenAuth);
    if (storeResult.isErr()) return storeResult;
  }

  return Ok(undefined);
};

/**
 * Return npm login token.
 */
const npmLogin = async function (
  username: string,
  password: string,
  email: string,
  registry: RegistryUrl
): Promise<Result<string, AuthenticationError>> {
  const client = makeNpmClient();
  const result = await client.addUser(registry, username, password, email)
    .promise;

  if (result.isOk()) {
    log.notice("auth", `you are authenticated as '${username}'`);
    return result;
  }

  if (result.error.status === 401)
    log.warn("401", "Incorrect username or password");
  else log.error(result.error.status.toString(), result.error.message);

  return result;
};

/**
 * Write npm token to .npmrc.
 * @throws {Error} An unhandled error occurred.
 */
const writeNpmToken = async function (registry: RegistryUrl, token: string) {
  const configPath = getNpmrcPath();
  // read config
  let content = "";
  if (fs.existsSync(configPath)) {
    content = fs.readFileSync(configPath, { encoding: "utf-8" });
  }
  // write config
  const lines = generateNpmrcLines(content, registry, token);
  const newContent = lines.join("\n") + "\n";
  fs.writeFileSync(configPath, newContent);
  log.notice("config", `saved to npm config: ${configPath}`);
};

/**
 * Return .npmrc config file path.
 * @throws {Error} Home-path could not be determined.
 */
export const getNpmrcPath = function () {
  const dirPath = process.env.USERPROFILE
    ? process.env.USERPROFILE
    : process.env.HOME;
  if (dirPath === undefined) throw new Error("Could not determine home path");
  return path.join(dirPath, ".npmrc");
};

/**
 * Generate .npmrc file content lines.
 */
export const generateNpmrcLines = function (
  content: string,
  registry: RegistryUrl,
  token: string
) {
  let lines = content ? content.split("\n") : [];
  const quotes = /(\?|=)/.test(token) ? '"' : "";
  // get the registry url without http protocol
  let registryUrl = registry.slice(registry.search(/:\/\//) + 1);
  // add trailing slash
  if (!registryUrl.endsWith("/")) registryUrl = registryUrl + "/";
  const index = lines.findIndex(function (element, index) {
    if (element.indexOf(registryUrl + ":_authToken=") !== -1) {
      // If an entry for the auth token is found, replace it
      lines[index] = element.replace(
        /authToken=.*/,
        "authToken=" + quotes + token + quotes
      );
      return true;
    }
    return false;
  });
  // If no entry for the auth token is found, add one
  if (index === -1) {
    lines.push(registryUrl + ":_authToken=" + quotes + token + quotes);
  }
  // Remove empty lines
  lines = lines.filter((l) => l);
  return lines;
};
