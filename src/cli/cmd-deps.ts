import log from "./logger";
import { EnvParseError, parseEnv } from "../utils/env";
import { isPackageUrl } from "../domain/package-url";
import {
  makePackageReference,
  PackageReference,
  splitPackageReference,
} from "../domain/package-reference";
import { CmdOptions } from "./options";
import {
  PackumentResolveError,
  VersionNotFoundError,
} from "../packument-resolving";
import { fetchPackageDependencies } from "../dependency-resolving";
import { PackumentNotFoundError } from "../common-errors";
import { Ok, Result } from "ts-results-es";
import { makePackumentFetchService } from "../services/fetch-packument";

export type DepsError = EnvParseError;

export type DepsOptions = CmdOptions<{
  deep?: boolean;
}>;

/**
 * Cmd-handler for listing dependencies for a package.
 * @param pkg Reference to a package.
 * @param options Command options.
 */
export type DepsCmd = (
  pkg: PackageReference,
  options: DepsOptions
) => Promise<Result<void, DepsError>>;

function errorPrefixForError(error: PackumentResolveError): string {
  if (error instanceof PackumentNotFoundError) return "missing dependency";
  else if (error instanceof VersionNotFoundError)
    return "missing dependency version";
  return "unknown";
}

/**
 * Makes a {@link DepsCmd} function.
 */
export function makeDepsCmd(): DepsCmd {
  return async (pkg, options) => {
    // parse env
    const envResult = await parseEnv(options);
    if (envResult.isErr()) return envResult;
    const env = envResult.value;

    const fetchService = makePackumentFetchService();

    const [name, version] = splitPackageReference(pkg);
    
    if (version !== undefined && isPackageUrl(version))
      // TODO: Convert to result
      throw new Error("Cannot get dependencies for url-version");

    const deep = options.deep || false;
    log.verbose(
      "dependency",
      `fetch: ${makePackageReference(name, version)}, deep=${deep}`
    );
    const [depsValid, depsInvalid] = await fetchPackageDependencies(
      env.registry,
      env.upstreamRegistry,
      name,
      version,
      deep,
      fetchService
    );
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

    return Ok(undefined);
  };
}