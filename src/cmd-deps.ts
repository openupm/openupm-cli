import log from "./logger";
import { atVersion, splitPkgName } from "./utils/pkg-name";
import { GlobalOptions, PkgName, PkgVersion } from "./types/global";
import { parseEnv } from "./utils/env";
import { fetchPackageDependencies } from "./client";

export type DepsOptions = {
  deep?: boolean;
  _global: GlobalOptions;
};

export const deps = async function (pkg: PkgName, options: DepsOptions) {
  // parse env
  const envOk = await parseEnv(options, { checkPath: false });
  if (!envOk) return 1;
  // parse name
  const { name, version } = splitPkgName(pkg);
  // deps
  await _deps({ name, version, deep: options.deep });
  return 0;
};

const _deps = async function ({
  name,
  version,
  deep,
}: {
  name: PkgName;
  version: PkgVersion | undefined;
  deep?: boolean;
}) {
  // eslint-disable-next-line no-unused-vars
  const [depsValid, depsInvalid] = await fetchPackageDependencies({
    name,
    version,
    deep,
  });
  depsValid
    .filter((x) => !x.self)
    .forEach((x) =>
      log.notice("dependency", `${atVersion(x.name, x.version)}`)
    );
  depsInvalid
    .filter((x) => !x.self)
    .forEach((x) => {
      let reason = "unknown";
      if (x.reason == "package404") reason = "missing dependency";
      else if (x.reason == "version404") reason = "missing dependency version";
      log.warn(reason, atVersion(x.name, x.version));
    });
};
