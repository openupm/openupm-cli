import { ParseEnv } from "../services/parse-env";
import { isPackageUrl } from "../domain/package-url";
import {
  makePackageReference,
  PackageReference,
  splitPackageReference,
} from "../domain/package-reference";
import { CmdOptions } from "./options";
import { PackumentVersionResolveError } from "../packument-version-resolving";
import { PackumentNotFoundError } from "../common-errors";
import { ResolveDependencies } from "../services/dependency-resolving";
import { Logger } from "npmlog";
import { logValidDependency } from "./dependency-logging";
import { VersionNotFoundError } from "../domain/packument";
import { DebugLog } from "../logging";
import { ResultCodes } from "./result-codes";
import {
  notifyEnvParsingFailed,
  notifyRemotePackumentVersionResolvingFailed,
} from "./error-logging";
import { isSemanticVersion } from "../domain/semantic-version";
import { Ok } from "ts-results-es";
import { ResolveLatestVersion } from "../services/resolve-latest-version";

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

function errorPrefixForError(error: PackumentVersionResolveError): string {
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
    const envResult = await parseEnv(options);
    if (envResult.isErr()) {
      notifyEnvParsingFailed(log, envResult.error);
      return ResultCodes.Error;
    }
    const env = envResult.value;
    const sources = [env.registry, env.upstreamRegistry];

    const [name, requestedVersion] = splitPackageReference(pkg);

    if (requestedVersion !== undefined && isPackageUrl(requestedVersion)) {
      log.error("", "cannot get dependencies for url-version");
      return ResultCodes.Error;
    }

    const versionResult =
      requestedVersion !== undefined && isSemanticVersion(requestedVersion)
        ? Ok(requestedVersion)
        : await resolveLatestVersion(sources, name).map((it) => it.value)
            .promise;
    if (versionResult.isErr()) {
      // TODO: Log error
      return ResultCodes.Error;
    }
    const version = versionResult.value;

    const deep = options.deep || false;
    debugLog(`fetch: ${makePackageReference(name, version)}, deep=${deep}`);
    const resolveResult = await resolveDependencies(
      sources,
      name,
      version,
      deep
    );
    if (resolveResult.isErr()) {
      notifyRemotePackumentVersionResolvingFailed(
        log,
        name,
        resolveResult.error
      );
      return ResultCodes.Error;
    }

    const [depsValid, depsInvalid] = resolveResult.value;

    depsValid.forEach((dependency) => logValidDependency(debugLog, dependency));
    depsValid
      .filter((x) => !x.self)
      .forEach((x) =>
        log.notice("dependency", `${makePackageReference(x.name, x.version)}`)
      );
    depsInvalid
      .filter((x) => !x.self)
      .forEach((x) => {
        const prefix = errorPrefixForError(x.reason);
        log.warn(prefix, x.name);
      });

    return ResultCodes.Ok;
  };
}
