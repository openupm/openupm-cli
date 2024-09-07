import chalk from "chalk";
import { Logger } from "npmlog";
import os from "os";
import { fetchLatestPackumentVersionUsing } from "../app/get-latest-version";
import { loadRegistryAuthUsing } from "../app/get-registry-auth";
import { resolveDependenciesUsing } from "../app/resolve-dependencies";
import { PackumentNotFoundError } from "../common-errors";
import {
  makePackageReference,
  PackageReference,
  splitPackageReference,
} from "../domain/package-reference";
import { PackageUrl } from "../domain/package-url";
import { unityRegistry } from "../domain/registry";
import { SemanticVersion } from "../domain/semantic-version";
import { getUserUpmConfigPathFor } from "../domain/upm-config";
import type { CheckUrlExists } from "../io/check-url";
import type { GetRegistryPackument } from "../io/packument-io";
import { getHomePathFromEnv } from "../io/special-paths";
import type { ReadTextFile } from "../io/text-file-io";
import { DebugLog } from "../logging";
import { queryAllRegistriesLazy } from "../utils/sources";
import { isZod } from "../utils/zod-utils";
import { stringifyDependencyGraph } from "./dependency-logging";
import { CmdOptions } from "./options";
import { parseEnvUsing } from "./parse-env";
import { ResultCodes } from "./result-codes";

/**
 * Options passed to the deps command.
 */
export type DepsOptions = CmdOptions<{
  /**
   * Whether to print only direct or deep dependencies.
   */
  deep?: boolean;
}>;

/**
 * The possible result codes with which the deps command can exit.
 */
export type DepsResultCode = ResultCodes.Ok | ResultCodes.Error;

/**
 * Cmd-handler for listing dependencies for a package.
 * @param pkg Reference to a package.
 * @param options Command options.
 */
export type DepsCmd = (
  pkg: PackageReference,
  options: DepsOptions
) => Promise<DepsResultCode>;

/**
 * Makes a {@link DepsCmd} function.
 */
export function makeDepsCmd(
  readTextFile: ReadTextFile,
  fetchPackument: GetRegistryPackument,
  checkUrlExists: CheckUrlExists,
  log: Logger,
  debugLog: DebugLog
): DepsCmd {
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
    const sources = [primaryRegistry, unityRegistry];

    const [packageName, requestedVersion] = splitPackageReference(pkg);

    if (requestedVersion !== undefined && isZod(requestedVersion, PackageUrl)) {
      log.error("", "cannot get dependencies for url-version");
      return ResultCodes.Error;
    }

    const latestVersion =
      requestedVersion !== undefined && isZod(requestedVersion, SemanticVersion)
        ? requestedVersion
        : (
            await queryAllRegistriesLazy(sources, (source) =>
              fetchLatestPackumentVersionUsing(
                fetchPackument,
                source,
                packageName
              )
            )
          )?.value ?? null;

    if (latestVersion === null) throw new PackumentNotFoundError(packageName);

    const deep = options.deep || false;
    await debugLog(
      `fetch: ${makePackageReference(packageName, latestVersion)}, deep=${deep}`
    );
    const dependencyGraph = await resolveDependenciesUsing(
      checkUrlExists,
      fetchPackument,
      sources,
      packageName,
      latestVersion,
      deep
    );

    const output = stringifyDependencyGraph(
      dependencyGraph,
      packageName,
      latestVersion,
      chalk
    ).join(os.EOL);
    log.notice("", output);

    return ResultCodes.Ok;
  };
}
