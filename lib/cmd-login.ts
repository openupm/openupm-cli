import fs from "fs";
import path from "path";
import _ from "lodash";
import promptly from "promptly";
import { assertIsNpmClientError, getNpmClient } from "./client";

import log from "./logger";

import {
  getUpmConfigDir,
  loadUpmConfig,
  parseEnv,
  saveUpmConfig,
} from "./core";

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
  if (!options.username) options.username = await promptly.prompt("Username: ");
  if (!options.password)
    options.password = await promptly.password("Password: ");
  if (!options.email) options.email = await promptly.prompt("Email: ");
  if (!options._global.registry)
    options._global.registry = await promptly.prompt("Registry: ", {
      validator: [validateRegistry],
    });
  let token = null;
  let _auth = null;
  if (options.basicAuth) {
    // basic auth
    const userPass = `${options.username}:${options.password}`;
    _auth = Buffer.from(userPass).toString("base64");
  } else {
    // npm login
    const result = await npmLogin({
      username: options.username,
      password: options.password,
      email: options.email,
      registry: options._global.registry,
    });
    if (result.code == 1) return result.code;
    if (!result.token) {
      log.error("auth", "can not find token from server response");
      return 1;
    }
    token = result.token;
    // write npm token
    await writeNpmToken({
      registry: options._global.registry,
      token: result.token,
    });
  }
  // write unity token
  await writeUnityToken({
    _auth,
    alwaysAuth: options.alwaysAuth || false,
    basicAuth: options.basicAuth || false,
    email: options.email,
    registry: options._global.registry,
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
  registry: Registry;
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
  registry: Registry;
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
  // TODO: Handle undefined
  // @ts-ignore
  const configPath = path.join(dirPath, ".npmrc");
  return configPath;
};

/**
 * Generate .npmrc file content lines
 * @param {*} content
 * @param {*} registry
 * @param {*} token
 */
export const generateNpmrcLines = function (
  content: string,
  registry: Registry,
  token: string
) {
  let lines = content ? content.split("\n") : [];
  const quotes = /(\?|=)/.test(token) ? '"' : "";
  // get the registry url without http protocal
  // TODO: Investigate extra quotes
  // @ts-ignore
  let registryUrl = registry.slice(registry.search(/:\/\//, "") + 1);
  // add trailing slash
  if (!registryUrl.endsWith("/")) registryUrl = registryUrl + "/";
  const index = _.findIndex(lines, function (element, index, array) {
    if (element.indexOf(registryUrl + ":_authToken=") !== -1) {
      // If an entry for the auth token is found, replace it
      // TODO: Investigate error
      // @ts-ignore
      array[index] = element.replace(
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
 * http protocal validator
 * @param {*} value
 */
export const validateRegistry = function (value: Registry): Registry {
  if (!/http(s?):\/\//.test(value))
    throw new Error("The registry address should starts with http(s)://");
  return value;
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
  _auth: string;
  alwaysAuth: boolean;
  basicAuth: boolean;
  email: string;
  registry: Registry;
  token: string;
}) {
  // Create config dir if necessary
  const configDir = await getUpmConfigDir();
  // Read config file
  const config = (await loadUpmConfig(configDir)) || {};
  if (!config.npmAuth) config.npmAuth = {};
  // Remove ending slash of registry
  if (registry.endsWith("/")) registry = registry.replace(/\/$/, "");

  if (basicAuth) {
    config["npmAuth"][registry] = {
      email,
      alwaysAuth,
      _auth,
    };
  } else {
    config["npmAuth"][registry] = {
      email,
      alwaysAuth,
      token,
    };
  }
  // Write config file
  await saveUpmConfig(config, configDir);
};
