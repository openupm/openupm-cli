import log from "./logger";
import { env, parseEnv } from "./utils/env";
import { fetchPackageDependencies, Registry } from "./registry-client";
import { isPackageUrl } from "./types/package-url";
import {
  packageReference,
  PackageReference,
  splitPackageReference,
} from "./types/package-reference";
import { CmdOptions } from "./types/options";

export type DepsOptions = CmdOptions<{
  deep?: boolean;
}>;

export const deps = async function (
  pkg: PackageReference,
  options: DepsOptions
) {
  // parse env
  const envOk = await parseEnv(options, false);
  if (!envOk) return 1;

  const registry: Registry = {
    url: env.registry,
    auth: env.auth[env.registry] ?? null,
  };
  const upstreamRegistry: Registry = {
    url: env.upstreamRegistry,
    auth: env.auth[env.upstreamRegistry] ?? null,
  };
  const [name, version] = splitPackageReference(pkg);

  if (version !== undefined && isPackageUrl(version))
    throw new Error("Cannot get dependencies for url-version");

  const [depsValid, depsInvalid] = await fetchPackageDependencies(
    registry,
    upstreamRegistry,
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
      let reason = "unknown";
      if (x.reason == "package404") reason = "missing dependency";
      else if (x.reason == "version404") reason = "missing dependency version";
      log.warn(reason, packageReference(x.name, x.version));
    });

  return 0;
};
