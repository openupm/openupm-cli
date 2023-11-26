import fs from "fs";
import path from "path";
import _ from "lodash";
import { assertIsNpmClientError, getNpmClient } from "./registry-client";
import log from "./logger";
import { GlobalOptions } from "./types/global";
import {
  getUpmConfigDir,
  loadUpmConfig,
  saveUpmConfig,
} from "./utils/upm-config-io";
import { parseEnv } from "./utils/env";
import { encodeBasicAuth } from "./types/upm-config";
import { Base64 } from "./types/base64";
import { RegistryUrl, removeTrailingSlash } from "./types/registry-url";
import {
  promptEmail,
  promptPassword,
  promptRegistryUrl,
  promptUsername,
} from "./utils/prompts";

export type LoginOptions = {
  username?: string;
  password?: string;
  email?: string;
  basicAuth?: boolean;
  alwaysAuth?: boolean;
  _global: GlobalOptions;
};

export const login = async function (options: LoginOptions) {
  // parse env
  const envOk = await parseEnv(options, { checkPath: false });
  if (!envOk) return 1;
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
    const result = await npmLogin({
      username: options.username,
      password: options.password,
      email: options.email,
      registry: options._global.registry as RegistryUrl,
    });
    if (result.code == 1) return result.code;
    if (!result.token) {
      log.error("auth", "can not find token from server response");
      return 1;
    }
    token = result.token;
    // write npm token
    await writeNpmToken({
      registry: options._global.registry as RegistryUrl,
      token: result.token,
    });
  }

  // write unity token
  await writeUnityToken({
    _auth,
    alwaysAuth: options.alwaysAuth || false,
    basicAuth: options.basicAuth || false,
    email: options.email,
    registry: options._global.registry as RegistryUrl,
    token,
  });
};

/**
 * Return npm login token
 */
const npmLogin = async function ({
  username,
  password,
  email,
  registry,
}: {
  username: string;
  password: string;
  email: string;
  registry: RegistryUrl;
}) {
  const client = getNpmClient();
  try {
    const data = await client.adduser(registry, {
      auth: {
        username,
        password,
        email,
      },
    });
    if (_.isString(data.ok)) log.notice("auth", data.ok);
    else if (data.ok) {
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
 * Write npm token to .npmrc
 * @param {*} param0
 */
const writeNpmToken = async function ({
  registry,
  token,
}: {
  registry: RegistryUrl;
  token: string;
}) {
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
 * Return .npmrc config file path
 */
export const getNpmrcPath = function () {
  const dirPath = process.env.USERPROFILE
    ? process.env.USERPROFILE
    : process.env.HOME;
  if (dirPath === undefined) throw new Error("Could not determine home path");
  return path.join(dirPath, ".npmrc");
};

/**
 * Generate .npmrc file content lines
 * @param {*} content
 * @param {*} registry
 * @param {*} token
 */
export const generateNpmrcLines = function (
  content: string,
  registry: RegistryUrl,
  token: string
) {
  let lines = content ? content.split("\n") : [];
  const quotes = /(\?|=)/.test(token) ? '"' : "";
  // get the registry url without http protocal
  let registryUrl = registry.slice(registry.search(/:\/\//) + 1);
  // add trailing slash
  if (!registryUrl.endsWith("/")) registryUrl = registryUrl + "/";
  const index = _.findIndex(lines, function (element, index) {
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
 * Write npm token to Unity
 */
const writeUnityToken = async function ({
  _auth,
  alwaysAuth,
  basicAuth,
  email,
  registry,
  token,
}: {
  _auth: Base64 | null;
  alwaysAuth: boolean;
  basicAuth: boolean;
  email: string;
  registry: RegistryUrl;
  token: string | null;
}) {
  // Create config dir if necessary
  const configDir = await getUpmConfigDir();
  // Read config file
  const config = (await loadUpmConfig(configDir)) || {};
  if (!config.npmAuth) config.npmAuth = {};
  // Remove ending slash of registry
  registry = removeTrailingSlash(registry);

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
