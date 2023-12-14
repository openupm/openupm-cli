import log from "./logger";
import { env, parseEnv } from "./utils/env";
import { fetchPackageDependencies, Registry } from "./registry-client";
import { DomainName } from "./types/domain-name";
import { isPackageUrl } from "./types/package-url";
import {
  packageReference,
  PackageReference,
  splitPackageReference,
  VersionReference,
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

  // parse name
  const [name, version] = splitPackageReference(pkg);
  // deps
  await _deps(registry, upstreamRegistry, name, version, options.deep);
  return 0;
};

const _deps = async function (
  registry: Registry,
  upstreamRegistry: Registry,
  name: DomainName,
  version: VersionReference | undefined,
  deep?: boolean
) {
  if (version !== undefined && isPackageUrl(version))
    throw new Error("Cannot get dependencies for url-version");

  const [depsValid, depsInvalid] = await fetchPackageDependencies(
    registry,
    upstreamRegistry,
    name,
    version,
    deep
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
};
