import { EnvParseError, ParseEnvService } from "../services/parse-env";
import { isPackageUrl } from "../domain/package-url";
import {
  makePackageReference,
  PackageReference,
  splitPackageReference,
} from "../domain/package-reference";
import { CmdOptions } from "./options";
import { PackumentVersionResolveError } from "../packument-version-resolving";
import { PackumentNotFoundError } from "../common-errors";
import { Ok, Result } from "ts-results-es";
import {
  DependencyResolveError,
  ResolveDependenciesService,
} from "../services/dependency-resolving";
import { Logger } from "npmlog";
import { logValidDependency } from "./dependency-logging";
import { VersionNotFoundError } from "../domain/packument";

export type DepsError = EnvParseError | DependencyResolveError;

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
  parseEnv: ParseEnvService,
  resolveDependencies: ResolveDependenciesService,
  log: Logger
): DepsCmd {
  return async (pkg, options) => {
    // parse env
    const envResult = await parseEnv(options);
    if (envResult.isErr()) return envResult;
    const env = envResult.value;

    const [name, version] = splitPackageReference(pkg);

    if (version !== undefined && isPackageUrl(version))
      // TODO: Convert to result
      throw new Error("Cannot get dependencies for url-version");

    const deep = options.deep || false;
    log.verbose(
      "dependency",
      `fetch: ${makePackageReference(name, version)}, deep=${deep}`
    );
    const resolveResult = await resolveDependencies(
      [env.registry, env.upstreamRegistry],
      name,
      version,
      deep
    );
    if (resolveResult.isErr())
      // TODO: Log errors
      // TODO: Add tests
      return resolveResult;
    const [depsValid, depsInvalid] = resolveResult.value;

    depsValid.forEach((dependency) => logValidDependency(log, dependency));
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
