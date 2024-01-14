import log from "../logger";
import chalk from "chalk";
import { getUpmConfigDir, loadUpmConfig } from "./upm-config-io";
import path from "path";
import fs from "fs";
import yaml from "yaml";
import { coerceRegistryUrl, registryUrl } from "../types/registry-url";
import { tryGetAuthForRegistry } from "../types/upm-config";
import { CmdOptions } from "../types/options";
import { manifestPathFor } from "../types/project-manifest";
import { Registry } from "../registry-client";

export type Env = {
  cwd: string;
  systemUser: boolean;
  wsl: boolean;
  upstream: boolean;
  upstreamRegistry: Registry;
  registry: Registry;
  editorVersion: string | null;
};

/**
 * Parse env.
 * @throws Error An unhandled error occurred.
 */
export const parseEnv = async function (
  options: CmdOptions,
  checkPath: boolean
): Promise<Env | null> {
  // set defaults
  const env = <Env>{};
  env.registry = {
    url: registryUrl("https://package.openupm.com"),
    auth: null,
  };
  env.cwd = "";
  env.upstream = true;
  env.upstreamRegistry = {
    url: registryUrl("https://packages.unity.com"),
    auth: null,
  };
  env.systemUser = false;
  env.wsl = false;
  env.editorVersion = null;
  // log level
  log.level = options._global.verbose ? "verbose" : "notice";
  // color
  const useColor =
    options._global.color !== false && process.env.NODE_ENV !== "test";
  if (!useColor) {
    chalk.level = 0;
    log.disableColor();
  }
  // upstream
  if (options._global.upstream === false) env.upstream = false;
  // region cn
  if (options._global.cn === true) {
    env.registry = {
      url: registryUrl("https://package.openupm.cn"),
      auth: null,
    };
    env.upstreamRegistry = {
      url: registryUrl("https://packages.unity.cn"),
      auth: null,
    };
    log.notice("region", "cn");
  }
  // registry
  if (options._global.registry) {
    env.registry = {
      url: coerceRegistryUrl(options._global.registry),
      auth: null,
    };
  }

  // auth
  if (options._global.systemUser) env.systemUser = true;
  if (options._global.wsl) env.wsl = true;
  const configDir = await getUpmConfigDir(env.wsl, env.systemUser);
  const upmConfig = await loadUpmConfig(configDir);

  if (upmConfig !== undefined && upmConfig.npmAuth !== undefined) {
    env.registry.auth = tryGetAuthForRegistry(upmConfig, env.registry.url);
    env.upstreamRegistry.auth = tryGetAuthForRegistry(
      upmConfig,
      env.upstreamRegistry.url
    );
  }
  // return if no need to check path
  if (!checkPath) return env;
  // cwd
  if (options._global.chdir) {
    const cwd = path.resolve(options._global.chdir);
    if (!fs.existsSync(cwd)) {
      log.error("env", `can not resolve path ${cwd}`);
      return null;
    }
    env.cwd = cwd;
  } else env.cwd = process.cwd();
  // manifest path
  const manifestPath = manifestPathFor(env.cwd);
  if (!fs.existsSync(manifestPath)) {
    log.error(
      "manifest",
      `can not locate manifest.json at path ${manifestPath}`
    );
    return null;
  }

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
  return env;
};
