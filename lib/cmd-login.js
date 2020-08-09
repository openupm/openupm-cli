const fs = require("fs");
const path = require("path");

const _ = require("lodash");
const promptly = require("promptly");

const { getNpmClient } = require("./client");
const { log } = require("./logger");
const {
  getUpmConfigDir,
  loadUpmConfig,
  saveUpmConfig,
  parseEnv
} = require("./core");

const login = async function(options) {
  // parse env
  const envOk = await parseEnv(options, { checkPath: false });
  if (!envOk) return 1;
  // query parameters
  if (!options.username) options.username = await promptly.prompt("Username: ");
  if (!options.password)
    options.password = await promptly.password("Password: ");
  if (!options.email) options.email = await promptly.prompt("Email: ");
  if (!options.parent.registry)
    options.parent.registry = await promptly.prompt("Registry: ", {
      validator: [validateRegistry]
    });
  let token = null;
  let _auth = null;
  if (options.basicAuth) {
    // basic auth
    const userPass = `${options.username}:${options.password}`;
    _auth = Buffer.from(userPass).toString("base64");
  } else {
    // npm login
    let result = await npmLogin({
      username: options.username,
      password: options.password,
      email: options.email,
      registry: options.parent.registry
    });
    if (result.code == 1) return result.code;
    if (!result.token) {
      log.error("auth", "can not find token from server response");
      return 1;
    }
    token = result.token;
    // write npm token
    await writeNpmToken({
      registry: options.parent.registry,
      token: result.token
    });
  }
  // write unity token
  await writeUnityToken({
    _auth,
    alwaysAuth: options.alwaysAuth || false,
    basicAuth: options.basicAuth || false,
    email: options.email,
    registry: options.parent.registry,
    token
  });
};

/**
 * Return npm login token
 * @param {*} param0
 */
const npmLogin = async function({ username, password, email, registry }) {
  const client = getNpmClient();
  try {
    const data = await client.adduser(registry, {
      auth: {
        username,
        password,
        email
      }
    });
    if (_.isString(data.ok)) log.notice("auth", data.ok);
    else if (data.ok)
      log.notice("auth", `you are authenticated as '${username}'`);
    const token = data.token;
    return { code: 0, token };
  } catch (err) {
    if (err.statusCode == 401 || err.code == "EAUTHUNKNOWN") {
      log.warn("401", "Incorrect username or password");
      return { code: 1 };
    } else {
      log.error(err.statusCode ? err.statusCode.toString() : "", err.message);
      return { code: 1 };
    }
  }
};

/**
 * Write npm token to .npmrc
 * @param {*} param0
 */
const writeNpmToken = async function({ registry, token }) {
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
const getNpmrcPath = function() {
  const dirPath = process.env.USERPROFILE
    ? process.env.USERPROFILE
    : process.env.HOME;
  const configPath = path.join(dirPath, ".npmrc");
  return configPath;
};

/**
 * Generate .npmrc file content lines
 * @param {*} content
 * @param {*} registry
 * @param {*} token
 */
const generateNpmrcLines = function(content, registry, token) {
  let lines = content ? content.split("\n") : [];
  const quotes = /(\?|=)/.test(token) ? '"' : "";
  // get the registry url without http protocal
  let registryUrl = registry.slice(registry.search(/:\/\//, "") + 1);
  // add trailing slash
  if (!registryUrl.endsWith("/")) registryUrl = registryUrl + "/";
  const index = _.findIndex(lines, function(element, index, array) {
    if (element.indexOf(registryUrl + ":_authToken=") !== -1) {
      // If an entry for the auth token is found, replace it
      array[index] = element.replace(
        /authToken=.*/,
        "authToken=" + quotes + token + quotes
      );
      return true;
    }
  });
  // If no entry for the auth token is found, add one
  if (index === -1) {
    lines.push(registryUrl + ":_authToken=" + quotes + token + quotes);
  }
  // Remove empty lines
  lines = lines.filter(l => l);
  return lines;
};

/**
 * http protocal validator
 * @param {*} value
 */
const validateRegistry = function(value) {
  if (!/http(s?):\/\//.test(value))
    throw new Error("The registry address should starts with http(s)://");
  return value;
};

/**
 * Write npm token to Unity
 * @param {*} param0
 */
const writeUnityToken = async function({
  _auth,
  alwaysAuth,
  basicAuth,
  email,
  registry,
  token
}) {
  // Create config dir if necessary
  const configDir = await getUpmConfigDir();
  // Read config file
  const config = (await loadUpmConfig(configDir)) || {};
  if (!config.npmAuth) config.npmAuth = {};
  // Remove ending slash of registry
  if (registry.endsWith("/")) registry = registry.replace(/\/$/, "");
  // Update config file
  config["npmAuth"][registry] = {
    email,
    alwaysAuth
  };
  if (basicAuth) config["npmAuth"][registry]._auth = _auth;
  else config["npmAuth"][registry].token = token;
  // Write config file
  await saveUpmConfig(config, configDir);
};

module.exports = {
  generateNpmrcLines,
  getNpmrcPath,
  login,
  npmLogin,
  validateRegistry
};
