import { ParseEnv } from "../services/parse-env";
import { PackageUrl } from "../domain/package-url";
import {
  makePackageReference,
  PackageReference,
  splitPackageReference,
} from "../domain/package-reference";
import { CmdOptions } from "./options";
import { PackumentNotFoundError } from "../common-errors";
import { ResolveDependencies } from "../services/dependency-resolving";
import { Logger } from "npmlog";
import { DebugLog } from "../logging";
import { ResultCodes } from "./result-codes";
import { ResolveLatestVersion } from "../services/resolve-latest-version";
import { SemanticVersion } from "../domain/semantic-version";
import { isZod } from "../utils/zod-utils";
import { stringifyDependencyGraph } from "./dependency-logging";
import os from "os";
import chalk from "chalk";

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
  resolveLatestVersion: ResolveLatestVersion,
  log: Logger,
  debugLog: DebugLog
): DepsCmd {
  return async (pkg, options) => {
    // parse env
    const env = await parseEnv(options);
    const sources = [env.registry, env.upstreamRegistry];

    const [packageName, requestedVersion] = splitPackageReference(pkg);

    if (requestedVersion !== undefined && isZod(requestedVersion, PackageUrl)) {
      log.error("", "cannot get dependencies for url-version");
      return ResultCodes.Error;
    }

    const latestVersion =
      requestedVersion !== undefined && isZod(requestedVersion, SemanticVersion)
        ? requestedVersion
        : (await resolveLatestVersion(sources, packageName))?.value ?? null;

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
