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
import { Registry } from "../npm-client";
import { Result } from "@badrap/result";
import { CustomError } from "ts-custom-error";
import ok = Result.ok;
import err = Result.err;

export type Env = Readonly<{
  cwd: string;
  systemUser: boolean;
  wsl: boolean;
  upstream: boolean;
  upstreamRegistry: Registry;
  registry: Registry;
  editorVersion: string | null;
}>;

export class CwdNotFoundError extends CustomError {}

export class ManifestNotFoundError extends CustomError {}

export type EnvParseError = CwdNotFoundError;

export type EnvParseResult = Result<Env, EnvParseError>;

/**
 * Attempts to parse env.
 */
export const parseEnv = async function (
  options: CmdOptions,
  checkPath: boolean
): Promise<EnvParseResult> {
  // set defaults
  let registry: Registry = {
    url: registryUrl("https://package.openupm.com"),
    auth: null,
  };
  let cwd = "";
  let upstream = true;
  let upstreamRegistry: Registry = {
    url: registryUrl("https://packages.unity.com"),
    auth: null,
  };
  let systemUser = false;
  let wsl = false;
  let editorVersion: string | null = null;
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
  if (options._global.upstream === false) upstream = false;
  // region cn
  if (options._global.cn === true) {
    registry = {
      url: registryUrl("https://package.openupm.cn"),
      auth: null,
    };
    upstreamRegistry = {
      url: registryUrl("https://packages.unity.cn"),
      auth: null,
    };
    log.notice("region", "cn");
  }
  // registry
  if (options._global.registry) {
    registry = {
      url: coerceRegistryUrl(options._global.registry),
      auth: null,
    };
  }

  // auth
  if (options._global.systemUser) systemUser = true;
  if (options._global.wsl) wsl = true;
  const configDir = await getUpmConfigDir(wsl, systemUser);
  const upmConfig = await loadUpmConfig(configDir);

  if (upmConfig !== undefined && upmConfig.npmAuth !== undefined) {
    registry = {
      url: registry.url,
      auth: tryGetAuthForRegistry(upmConfig, registry.url),
    };
    upstreamRegistry = {
      url: upstreamRegistry.url,
      auth: tryGetAuthForRegistry(upmConfig, upstreamRegistry.url),
    };
  }
  // return if no need to check path
  if (!checkPath)
    return ok({
      cwd,
      editorVersion,
      registry,
      systemUser,
      upstream,
      upstreamRegistry,
      wsl,
    });
  // cwd
  if (options._global.chdir) {
    cwd = path.resolve(options._global.chdir);
    if (!fs.existsSync(cwd)) {
      log.error("env", `can not resolve path ${cwd}`);
      return err(new CwdNotFoundError());
    }
  } else cwd = process.cwd();
  // manifest path
  const manifestPath = manifestPathFor(cwd);
  if (!fs.existsSync(manifestPath)) {
    log.error(
      "manifest",
      `can not locate manifest.json at path ${manifestPath}`
    );
    return err(new ManifestNotFoundError());
  }

  // editor version
  const projectVersionPath = path.join(
    cwd,
    "ProjectSettings/ProjectVersion.txt"
  );
  if (!fs.existsSync(projectVersionPath)) {
    log.warn(
      "ProjectVersion",
      `can not locate ProjectVersion.text at path ${projectVersionPath}`
    );
  } else {
    const projectVersionData = fs.readFileSync(projectVersionPath, "utf8");
    const projectVersionContent = yaml.parse(projectVersionData) as unknown;

    if (
      !(
        typeof projectVersionContent === "object" &&
        projectVersionContent !== null &&
        "m_EditorVersion" in projectVersionContent &&
        typeof projectVersionContent.m_EditorVersion === "string"
      )
    )
      throw new Error(
        "ProjectVersion.txt could not be parsed for editor-version!"
      );

    editorVersion = projectVersionContent.m_EditorVersion;
  }
  // return
  return ok({
    cwd,
    editorVersion,
    registry,
    systemUser,
    upstream,
    upstreamRegistry,
    wsl,
  });
};
