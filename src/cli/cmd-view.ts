import { Logger } from "npmlog";
import { EOL } from "os";
import { loadRegistryAuthUsing } from "../app/get-registry-auth";
import { PackumentNotFoundError } from "../common-errors";
import {
  hasVersion,
  PackageReference,
  splitPackageReference,
} from "../domain/package-reference";
import { unityRegistry } from "../domain/registry";
import { getUserUpmConfigPathFor } from "../domain/upm-config";
import { GetRegistryPackument } from "../io/packument-io";
import { getHomePathFromEnv } from "../io/special-paths";
import type { ReadTextFile } from "../io/text-file-io";
import type { DebugLog } from "../logging";
import { queryAllRegistriesLazy } from "../utils/sources";
import { CmdOptions } from "./options";
import { formatPackumentInfo } from "./output-formatting";
import { parseEnvUsing } from "./parse-env";
import { ResultCodes } from "./result-codes";

/**
 * Options passed to the view command.
 */
export type ViewOptions = CmdOptions;

/**
 * The possible result codes with which the view command can exit.
 */
export type ViewResultCode = ResultCodes.Ok | ResultCodes.Error;

/**
 * Cmd-handler for viewing package information.
 * @param pkg Reference to the package to view.
 * @param options Command options.
 */
export type ViewCmd = (
  pkg: PackageReference,
  options: ViewOptions
) => Promise<ViewResultCode>;

/**
 * Makes a {@link ViewCmd} function.
 */
export function makeViewCmd(
  getRegistryPackument: GetRegistryPackument,
  readTextFile: ReadTextFile,
  debugLog: DebugLog,
  log: Logger
): ViewCmd {
  return async (pkg, options) => {
    // parse env
    const env = await parseEnvUsing(log, process.env, process.cwd(), options);
    const homePath = getHomePathFromEnv(process.env);
    const upmConfigPath = getUserUpmConfigPathFor(
      process.env,
      homePath,
      env.systemUser
    );

    const primaryRegistry = await loadRegistryAuthUsing(
      readTextFile,
      debugLog,
      upmConfigPath,
      env.primaryRegistryUrl
    );

    // parse name
    if (hasVersion(pkg)) {
      const [name] = splitPackageReference(pkg);
      log.warn("", `please do not specify a version (Write only '${name}').`);
      return ResultCodes.Error;
    }

    // verify name
    const sources = [primaryRegistry, ...(env.upstream ? [unityRegistry] : [])];
    const packumentFromRegistry = await queryAllRegistriesLazy(
      sources,
      (source) => getRegistryPackument(source, pkg)
    );
    const packument = packumentFromRegistry?.value ?? null;
    if (packument === null) throw new PackumentNotFoundError(pkg);

    const output = formatPackumentInfo(packument, EOL);
    log.notice("", output);
    return ResultCodes.Ok;
  };
}
