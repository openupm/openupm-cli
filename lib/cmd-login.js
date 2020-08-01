const fs = require("fs");
const path = require("path");

const _ = require("lodash");
const mkdirp = require("mkdirp");
const promptly = require("promptly");
const { promisify } = require("util");
const isWsl = require("is-wsl");
const RegClient = require("npm-registry-client");
const TOML = require("@iarna/toml");

const { log, dummyLogger } = require("./logger");
const { parseEnv } = require("./core");
const { execute } = require("./utils/process");

const login = async function(options) {
  // parse env
  if (!parseEnv(options, { checkPath: false })) return 1;
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
  if (options.alwaysAuth) {
    // always auth
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
      log.error("can not find npm token from server response");
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
    email: options.email,
    registry: options.parent.registry,
    systemUser: options.systemUser,
    token,
    wsl: options.wsl
  });
};

/**
 * Return npm login token
 * @param {*} param0
 */
const npmLogin = async function({ username, password, email, registry }) {
  const client = new RegClient({ log: dummyLogger });
  const adduserAsync = promisify(client.adduser.bind(client));
  try {
    const data = await adduserAsync(registry, {
      auth: {
        username,
        password,
        email
      }
    });
    if (_.isString(data.ok)) log.info(data.ok);
    else if (data.ok) log.info(`you are authenticated as '${username}'`);
    else if (data.ok) log.info(`token: '${username}'`);
    const token = data.token;
    return { code: 0, token };
  } catch (err) {
    console.log(err);
    if (err.code == "EAUTHUNKNOWN") {
      log.warn("Incorrect username or password");
      return { code: 1 };
    } else {
      log.error(err.message);
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
  log.info(`saved to npm config: ${configPath}`);
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
  email,
  registry,
  systemUser,
  token,
  wsl
}) {
  // Create config dir if necessary
  const configDir = await getUpmConfigDir({
    systemUser,
    wsl
  });
  mkdirp.sync(configDir);
  // Read config file if exists
  const configPath = path.join(configDir, ".upmconfig.toml");
  let config = {};
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, "utf8");
    config = TOML.parse(content);
  }
  if (!config.npmAuth) config.npmAuth = {};
  // Remove ending slash of registry
  if (registry.endsWith("/")) registry = registry.replace(/\/$/, "");
  // Update config file
  config["npmAuth"][registry] = {
    email,
    alwaysAuth
  };
  if (alwaysAuth) config["npmAuth"][registry]._auth = _auth;
  else config["npmAuth"][registry].token = token;
  // Write config file
  const newContent = TOML.stringify(config);
  fs.writeFileSync(configPath, newContent, "utf8");
  log.info("saved to unity config: " + configPath);
};

/**
 * Return .upmconfig.toml config file directory
 */
const getUpmConfigDir = async function({ systemUser, wsl }) {
  let dirPath = "";
  const systemUserSubPath = "Unity/config/ServiceAccounts";
  if (wsl) {
    if (!isWsl) {
      throw new Error("no WSL detected");
    }
    if (systemUser) {
      const allUserProfilePath = await execute(
        'wslpath "$(wslvar ALLUSERSPROFILE)"',
        { trim: true }
      );
      dirPath = path.join(allUserProfilePath, systemUserSubPath);
    } else {
      dirPath = await execute('wslpath "$(wslvar USERPROFILE)"', {
        trim: true
      });
    }
  } else {
    dirPath = process.env.USERPROFILE
      ? process.env.USERPROFILE
      : process.env.HOME;
    if (systemUser) {
      if (!process.env.ALLUSERSPROFILE) {
        throw new Error("env ALLUSERSPROFILE is empty");
      }
      dirPath = path.join(process.env.ALLUSERSPROFILE, systemUserSubPath);
    }
  }
  return dirPath;
};

module.exports = {
  generateNpmrcLines,
  getNpmrcPath,
  login,
  npmLogin,
  validateRegistry
};
