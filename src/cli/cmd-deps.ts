import { ParseEnv } from "../services/parse-env";
import { isPackageUrl } from "../domain/package-url";
import {
  makePackageReference,
  PackageReference,
  splitPackageReference,
} from "../domain/package-reference";
import { CmdOptions } from "./options";
import { ResolvePackumentVersionError } from "../packument-version-resolving";
import { PackumentNotFoundError } from "../common-errors";
import { ResolveDependencies } from "../services/dependency-resolving";
import { Logger } from "npmlog";
import { logValidDependency } from "./dependency-logging";
import { VersionNotFoundError } from "../domain/packument";
import { DebugLog } from "../logging";
import { ResultCodes } from "./result-codes";
import { ResolveLatestVersion } from "../services/resolve-latest-version";
import { isSemanticVersion } from "../domain/semantic-version";
import { flattenDependencyGraph } from "../domain/dependency-graph";

export type DepsOptions = CmdOptions<{
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

function errorPrefixForError(error: ResolvePackumentVersionError): string {
  if (error instanceof PackumentNotFoundError) return "missing dependency";
  else if (error instanceof VersionNotFoundError)
    return "missing dependency version";
  return "unknown";
}

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

    if (requestedVersion !== undefined && isPackageUrl(requestedVersion)) {
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

    flattenDependencyGraph(dependencyGraph).forEach(
      ([dependencyName, dependencyVersion, dependency]) => {
        if (!dependency.resolved) {
          if (dependencyName !== packageName) {
            const prefix = errorPrefixForError(dependency.error);
            log.warn(prefix, dependencyName);
          }
          return;
        }
        const dependencyRef = makePackageReference(
          dependencyName,
          dependencyVersion
        );
        logValidDependency(debugLog, dependencyRef, dependency.source);

        if (dependencyName === packageName) return;

        log.notice("dependency", `${dependencyRef}`);
      }
    );

    return ResultCodes.Ok;
  };
}
