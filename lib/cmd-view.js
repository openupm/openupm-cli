const log = require("./logger");
const {
  env,
  getPackageInfo,
  getLatestVersion,
  parseEnv,
  parseName
} = require("./core");

const view = async function(pkg, options) {
  // parse env
  if (!parseEnv(options, { checkPath: false })) return 1;
  // parse name
  let { name, version } = parseName(pkg);
  if (version) {
    log.error("command doesn't support name@version, using name instead");
    return 1;
  }
  // verify name
  let pkgInfo = await getPackageInfo(name);
  if (!pkgInfo && env.upstream)
    pkgInfo = await getPackageInfo(name, env.upstreamRegistry);
  if (!pkgInfo) {
    log.error(`package not found: ${name}`);
    return 1;
  }
  // print info
  printInfo(pkgInfo);
  return 0;
};

const printInfo = function(pkg) {
  // log.info(pkg);
  log.info();
  const versionCount = Object.keys(pkg.versions).length;
  const ver = getLatestVersion(pkg);
  const verInfo = pkg.versions[ver];
  const license = verInfo.license || "proprietary or unlicensed";
  const displayName = verInfo.displayName;
  const description = verInfo.description || pkg.description;
  const keywords = verInfo.keywords || pkg.keywords;
  const homepage = verInfo.homepage;
  const dist = verInfo.dist;
  const dependencies = verInfo.dependencies;
  const time = (pkg.time.modified || "").split("T")[0];

  log.info(`${pkg.name}@${ver} | ${license} | versions: ${versionCount}`);
  log.info();
  if (displayName) log.info(`display name: ${displayName}`);
  if (description) log.info(`description: ${description}`);
  if (description && description.includes("\n")) log.info();
  if (homepage) log.info(`homepage: ${homepage}`);
  if (keywords) log.info(`keywords: ${keywords.join(", ")}`);

  if (dist) {
    log.info();
    log.info("dist");
    log.info(`.tarball: ${dist.tarball}`);
    if (dist.shasum) log.info(`.shasum: ${dist.shasum}`);
    if (dist.integrity) log.info(`.integrity: ${dist.integrity}`);
  }

  if (dependencies && Object.keys(dependencies).length > 0) {
    log.info();
    log.info("dependencies");
    Object.keys(dependencies)
      .sort()
      .forEach(n => log.info(`${n} ${dependencies[n]}`));
    // log.info(dependencies);
  }

  log.info();
  log.info(`published at ${time}`);
};

module.exports = view;
