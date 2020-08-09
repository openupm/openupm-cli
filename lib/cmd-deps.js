const { log } = require("./logger");
const { fetchPackageDependencies, parseEnv, parseName } = require("./core");

const deps = async function(pkg, options) {
  // parse env
  const envOk = await parseEnv(options, { checkPath: false });
  if (!envOk) return 1;
  // parse name
  let { name, version } = parseName(pkg);
  // deps
  await _deps({ name, version, deep: options.deep });
  return 0;
};

const _deps = async function({ name, version, deep }) {
  const results = await fetchPackageDependencies({ name, version, deep });
  results
    .filter(x => !x.self)
    .forEach(x => log.notice("dependency", `${x.name}@${x.version}`));
};

module.exports = deps;
