import log from "./logger";
import { parseEnv } from "./utils/env";
import { makeNpmClient } from "./npm-client";
import { isPackageUrl } from "./types/package-url";
import {
  packageReference,
  PackageReference,
  splitPackageReference,
} from "./types/package-reference";
import { CmdOptions } from "./types/options";
import {
  PackumentNotFoundError,
  PackumentResolveError,
  VersionNotFoundError,
} from "./packument-resolving";
import { fetchPackageDependencies } from "./dependency-resolving";

type DepsResultCode = 0 | 1;

export type DepsOptions = CmdOptions<{
  deep?: boolean;
}>;

function errorPrefixForError(error: PackumentResolveError): string {
  if (error instanceof PackumentNotFoundError) return "missing dependency";
  else if (error instanceof VersionNotFoundError)
    return "missing dependency version";
  return "unknown";
}

/**
 * @throws {Error} An unhandled error occurred.
 */
export const deps = async function (
  pkg: PackageReference,
  options: DepsOptions
): Promise<DepsResultCode> {
  // parse env
  const envResult = await parseEnv(options, true);
  if (!envResult.isOk) return 1;
  const env = envResult.value;

  const client = makeNpmClient();

  const [name, version] = splitPackageReference(pkg);

  if (version !== undefined && isPackageUrl(version))
    throw new Error("Cannot get dependencies for url-version");

  const [depsValid, depsInvalid] = await fetchPackageDependencies(
    env.registry,
    env.upstreamRegistry,
    name,
    version,
    options.deep || false,
    client
  );
  depsValid
    .filter((x) => !x.self)
    .forEach((x) =>
      log.notice("dependency", `${packageReference(x.name, x.version)}`)
    );
  depsInvalid
    .filter((x) => !x.self)
    .forEach((x) => {
      const prefix = errorPrefixForError(x.reason);
      log.warn(prefix, x.name);
    });

  return 0;
};
