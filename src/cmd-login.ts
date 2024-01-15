import fs from "fs";
import path from "path";
import { assertIsNpmClientError, getNpmClient } from "./registry-client";
import log from "./logger";
import {
  getUpmConfigDir,
  loadUpmConfig,
  saveUpmConfig,
} from "./utils/upm-config-io";
import { parseEnv } from "./utils/env";
import { encodeBasicAuth } from "./types/upm-config";
import { Base64 } from "./types/base64";
import { RegistryUrl } from "./types/registry-url";
import {
  promptEmail,
  promptPassword,
  promptRegistryUrl,
  promptUsername,
} from "./utils/prompts";
import { CmdOptions } from "./types/options";

export type LoginOptions = CmdOptions<{
  username?: string;
  password?: string;
  email?: string;
  basicAuth?: boolean;
  alwaysAuth?: boolean;
}>;

type LoginResultCode = 0 | 1;

/**
 * @throws {Error} An unhandled error occurred.
 */
export const login = async function (
  options: LoginOptions
): Promise<LoginResultCode> {
  // parse env
  const env = await parseEnv(options, false);
  if (env === null) return 1;
  // query parameters
  if (!options.username) options.username = await promptUsername();
  if (!options.password) options.password = await promptPassword();
  if (!options.email) options.email = await promptEmail();
  if (!options._global.registry)
    options._global.registry = await promptRegistryUrl();
  let token: string | null = null;
  let _auth: Base64 | null = null;
  if (options.basicAuth) {
    // basic auth
    _auth = encodeBasicAuth(options.username, options.password);
  } else {
    // npm login
    const result = await npmLogin(
      options.username,
      options.password,
      options.email,
      options._global.registry as RegistryUrl
    );
    if (result.code == 1) return result.code;
    if (!result.token) {
      log.error("auth", "can not find token from server response");
      return 1;
    }
    token = result.token;
    // write npm token
    await writeNpmToken(options._global.registry as RegistryUrl, result.token);
  }

  // write unity token
  const configDir = await getUpmConfigDir(env.wsl, env.systemUser);
  await writeUnityToken(
    configDir,
    _auth,
    options.alwaysAuth || false,
    options.basicAuth || false,
    options.email,
    options._global.registry as RegistryUrl,
    token
  );

  return 0;
};

/**
 * The result of a login attempt. Either success with the token, or failure.
 */
type LoginResult = { code: 0; token: string } | { code: 1 };

/**
 * Return npm login token
 */
const npmLogin = async function (
  username: string,
  password: string,
  email: string,
  registry: RegistryUrl
): Promise<LoginResult> {
  const client = getNpmClient();
  try {
    const data = await client.adduser(registry, {
      auth: {
        username,
        password,
        email,
      },
    });
    if (data.ok) {
      log.notice("auth", `you are authenticated as '${username}'`);
      const token = data.token;
      return { code: 0, token };
    }
    return { code: 1 };
  } catch (err) {
    assertIsNpmClientError(err);

    if (err.response.statusCode == 401) {
      log.warn("401", "Incorrect username or password");
      return { code: 1 };
    } else {
      log.error(err.response.statusCode.toString(), err.message);
      return { code: 1 };
    }
  }
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

/**
 * Write npm token to Unity.
 * @throws {Error} The specified authentication information was missing.
 */
const writeUnityToken = async function (
  configDir: string,
  _auth: Base64 | null,
  alwaysAuth: boolean,
  basicAuth: boolean,
  email: string,
  registry: RegistryUrl,
  token: string | null
) {
  // Read config file
  const config = (await loadUpmConfig(configDir)) || {};
  if (!config.npmAuth) config.npmAuth = {};

  if (basicAuth) {
    if (_auth === null) throw new Error("Auth is null");
    config["npmAuth"][registry] = {
      email,
      alwaysAuth,
      _auth,
    };
  } else {
    if (token === null) throw new Error("Token is null");
    config["npmAuth"][registry] = {
      email,
      alwaysAuth,
      token,
    };
  }
  // Write config file
  await saveUpmConfig(config, configDir);
};
