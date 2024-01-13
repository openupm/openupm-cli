import log from "./logger";
import { parseEnv } from "./utils/env";
import { Dependency, fetchPackageDependencies } from "./registry-client";
import { isPackageUrl } from "./types/package-url";
import {
  packageReference,
  PackageReference,
  splitPackageReference,
} from "./types/package-reference";
import { CmdOptions } from "./types/options";

type DepsResultCode = 0 | 1;

export type DepsOptions = CmdOptions<{
  deep?: boolean;
}>;

function errorPrefixForError(errorReason: Dependency["reason"]): string {
  if (errorReason === "package404") return "missing dependency";
  else if (errorReason === "version404") return "missing dependency version";
  return "unknown";
}

/**
 * @throws Error An unhandled error occurred
 */
export const deps = async function (
  pkg: PackageReference,
  options: DepsOptions
): Promise<DepsResultCode> {
  // parse env
  const env = await parseEnv(options, false);
  if (env === null) return 1;

  const [name, version] = splitPackageReference(pkg);

  if (version !== undefined && isPackageUrl(version))
    throw new Error("Cannot get dependencies for url-version");

  const [depsValid, depsInvalid] = await fetchPackageDependencies(
    env.registry,
    env.upstreamRegistry,
    name,
    version,
    options.deep
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
      log.warn(prefix, packageReference(x.name, x.version));
    });

  return 0;
};
