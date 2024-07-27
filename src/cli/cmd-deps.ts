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
import {
  logFailedDependency,
  logResolvedDependency,
} from "./dependency-logging";
import { DebugLog } from "../logging";
import { ResultCodes } from "./result-codes";
import { ResolveLatestVersion } from "../services/resolve-latest-version";
import { isSemanticVersion } from "../domain/semantic-version";
import { NodeType, traverseDependencyGraph } from "../domain/dependency-graph";
import { isZod } from "../utils/zod-utils";

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
      requestedVersion !== undefined && isSemanticVersion(requestedVersion)
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

    for (const [
      dependencyName,
      dependencyVersion,
      dependency,
    ] of traverseDependencyGraph(dependencyGraph)) {
      if (dependency.type === NodeType.Failed) {
        if (dependencyName !== packageName)
          logFailedDependency(
            log,
            dependencyName,
            dependencyVersion,
            dependency
          );

        continue;
      }
      const dependencyRef = makePackageReference(
        dependencyName,
        dependencyVersion
      );

      if (dependency.type === NodeType.Resolved)
        logResolvedDependency(debugLog, dependencyRef, dependency.source);

      if (dependencyName === packageName) continue;

      log.notice("dependency", dependencyRef);
    }

    return ResultCodes.Ok;
  };
}
