import chalk from "chalk";
import { Logger } from "npmlog";
import os from "os";
import { PackumentNotFoundError } from "../common-errors";
import {
  makePackageReference,
  PackageReference,
  splitPackageReference,
} from "../domain/package-reference";
import { PackageUrl } from "../domain/package-url";
import { unityRegistry } from "../domain/registry";
import { SemanticVersion } from "../domain/semantic-version";
import { DebugLog } from "../logging";
import { ResolveDependencies } from "../app/dependency-resolving";
import { GetLatestVersion } from "../app/get-latest-version";
import { GetRegistryAuth } from "../app/get-registry-auth";
import { ParseEnv } from "../app/parse-env";
import { queryAllRegistriesLazy } from "../utils/sources";
import { isZod } from "../utils/zod-utils";
import { stringifyDependencyGraph } from "./dependency-logging";
import { CmdOptions } from "./options";
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
  parseEnv: ParseEnv,
  resolveDependencies: ResolveDependencies,
  resolveLatestVersion: GetLatestVersion,
  getRegistryAuth: GetRegistryAuth,
  log: Logger,
  debugLog: DebugLog
): DepsCmd {
  return async (pkg, options) => {
    // parse env
    const env = await parseEnv(options);
    const primaryRegistry = await getRegistryAuth(
      env.systemUser,
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
              resolveLatestVersion(source, packageName)
            )
          )?.value ?? null;

    if (latestVersion === null) throw new PackumentNotFoundError(packageName);

    const deep = options.deep || false;
    debugLog(
      `fetch: ${makePackageReference(packageName, latestVersion)}, deep=${deep}`
    );
    const dependencyGraph = await resolveDependencies(
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
