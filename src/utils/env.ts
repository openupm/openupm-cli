import { Env, GlobalOptions } from "../types/global";
import log from "../logger";
import chalk from "chalk";
import { loadUpmConfig } from "./upm-config";
import path from "path";
import fs from "fs";
import yaml from "yaml";
import { isIpAddress } from "../types/ip-address";
import { namespaceFor, openUpmReverseDomainName } from "../types/domain-name";
import {
  coerceRegistryUrl,
  RegistryUrl,
  registryUrl,
} from "../types/registry-url";
import url from "url";

export const env: Env = <Env>{};

// Parse env
export const parseEnv = async function (
  options: { _global: GlobalOptions } & Record<string, unknown>,
  { checkPath }: { checkPath: unknown }
) {
  // set defaults
  env.registry = registryUrl("https://package.openupm.com");
  env.cwd = "";
  env.manifestPath = "";
  env.namespace = openUpmReverseDomainName;
  env.upstream = true;
  env.color = true;
  env.upstreamRegistry = registryUrl("https://packages.unity.com");
  env.systemUser = false;
  env.wsl = false;
  env.editorVersion = null;
  env.region = "us";
  // the npmAuth field of .upmconfig.toml
  env.npmAuth = {};
  // the dict of auth param for npm registry API
  env.auth = {};
  // log level
  log.level = options._global.verbose ? "verbose" : "notice";
  // color
  if (options._global.color === false) env.color = false;
  if (process.env.NODE_ENV == "test") env.color = false;
  if (!env.color) {
    chalk.level = 0;
    log.disableColor();
  }
  // upstream
  if (options._global.upstream === false) env.upstream = false;
  // region cn
  if (options._global.cn === true) {
    env.registry = registryUrl("https://package.openupm.cn");
    env.upstreamRegistry = registryUrl("https://packages.unity.cn");
    env.region = "cn";
    log.notice("region", "cn");
  }
  // registry
  if (options._global.registry) {
    env.registry = coerceRegistryUrl(options._global.registry);
    // TODO: Check hostname for null
    const hostname = url.parse(env.registry).hostname as string;
    if (isIpAddress(hostname)) env.namespace = hostname;
    else env.namespace = namespaceFor(hostname);
  }
  // auth
  if (options._global.systemUser) env.systemUser = true;
  if (options._global.wsl) env.wsl = true;
  const upmConfig = await loadUpmConfig();
  if (upmConfig) {
    env.npmAuth = upmConfig.npmAuth;
    if (env.npmAuth !== undefined) {
      (Object.keys(env.npmAuth) as RegistryUrl[]).forEach((reg) => {
        const regAuth = env.npmAuth![reg];
        if ("token" in regAuth) {
          env.auth[reg] = {
            token: regAuth.token,
            alwaysAuth: regAuth.alwaysAuth || false,
          };
        } else if ("_auth" in regAuth) {
          const buf = Buffer.from(regAuth._auth, "base64");
          const text = buf.toString("utf-8");
          const [username, password] = text.split(":", 2);
          env.auth[reg] = {
            username,
            password: Buffer.from(password).toString("base64"),
            email: regAuth.email,
            alwaysAuth: regAuth.alwaysAuth || false,
          };
        } else {
          log.warn(
            "env.auth",
            `failed to parse auth info for ${reg} in .upmconfig.toml: missing token or _auth fields`
          );
          log.warn("env.auth", regAuth);
        }
      });
    }
  }
  // log.verbose("env.npmAuth", env.npmAuth);
  // log.verbose("env.auth", env.auth);
  // return if no need to check path
  if (!checkPath) return true;
  // cwd
  if (options._global.chdir) {
    const cwd = path.resolve(options._global.chdir);
    if (!fs.existsSync(cwd)) {
      log.error("env", `can not resolve path ${cwd}`);
      return false;
    }
    env.cwd = cwd;
  } else env.cwd = process.cwd();
  // manifest path
  const manifestPath = path.join(env.cwd, "Packages/manifest.json");
  if (!fs.existsSync(manifestPath)) {
    log.error(
      "manifest",
      `can not locate manifest.json at path ${manifestPath}`
    );
    return false;
  } else env.manifestPath = manifestPath;
  // editor version
  const projectVersionPath = path.join(
    env.cwd,
    "ProjectSettings/ProjectVersion.txt"
  );
  if (!fs.existsSync(projectVersionPath)) {
    log.warn(
      "ProjectVersion",
      `can not locate ProjectVersion.text at path ${projectVersionPath}`
    );
  } else {
    const projectVersionData = fs.readFileSync(projectVersionPath, "utf8");
    const projectVersionContent = yaml.parse(projectVersionData);
    env.editorVersion = projectVersionContent.m_EditorVersion;
  }
  // return
  return true;
};
