import log from "./logger";
import { parseEnv } from "./utils/env";
import { fetchPackageDependencies, getNpmClient } from "./registry-client";
import { isPackageUrl } from "./types/package-url";
import {
  packageReference,
  PackageReference,
  splitPackageReference,
} from "./types/package-reference";
import { CmdOptions } from "./types/options";
import { ResolveFailure } from "./packument-resolving";

type DepsResultCode = 0 | 1;

export type DepsOptions = CmdOptions<{
  deep?: boolean;
}>;

function errorPrefixForIssue(issue: ResolveFailure["issue"]): string {
  if (issue === "PackumentNotFound") return "missing dependency";
  else if (issue === "VersionNotFound") return "missing dependency version";
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
  const env = await parseEnv(options, false);
  if (env === null) return 1;

  const client = getNpmClient();

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
      const prefix = errorPrefixForIssue(x.reason.issue);
      log.warn(prefix, x.name);
    });

  return 0;
};
