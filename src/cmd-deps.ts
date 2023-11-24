import log from "./logger";
import { GlobalOptions } from "./types/global";
import { parseEnv } from "./utils/env";
import { fetchPackageDependencies } from "./registry-client";
import { DomainName } from "./types/domain-name";
import { isPackageUrl } from "./types/package-url";
import {
  packageReference,
  PackageReference,
  splitPackageReference,
  VersionReference,
} from "./types/package-reference";

export type DepsOptions = {
  deep?: boolean;
  _global: GlobalOptions;
};

export const deps = async function (
  pkg: PackageReference,
  options: DepsOptions
) {
  // parse env
  const envOk = await parseEnv(options, { checkPath: false });
  if (!envOk) return 1;
  // parse name
  const [name, version] = splitPackageReference(pkg);
  // deps
  await _deps({ name, version, deep: options.deep });
  return 0;
};

const _deps = async function ({
  name,
  version,
  deep,
}: {
  name: DomainName;
  version: VersionReference | undefined;
  deep?: boolean;
}) {
  if (version !== undefined && isPackageUrl(version))
    throw new Error("Cannot get dependencies for url-version");

  const [depsValid, depsInvalid] = await fetchPackageDependencies({
    name,
    version,
    deep,
  });
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
