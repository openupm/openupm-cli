const { log } = require("./logger");
const {
  env,
  fetchPackageInfo,
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
    log.warn("", `please replace '${name}@${version}' with '${name}'`);
    return 1;
  }
  // verify name
  let pkgInfo = await fetchPackageInfo(name);
  if (!pkgInfo && env.upstream)
    pkgInfo = await fetchPackageInfo(name, env.upstreamRegistry);
  if (!pkgInfo) {
    log.error("404", `package not found: ${name}`);
    return 1;
  }
  // print info
  printInfo(pkgInfo);
  return 0;
};

const printInfo = function(pkg) {
  console.log();
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

  console.log(`${pkg.name}@${ver} | ${license} | versions: ${versionCount}`);
  console.log();
  if (displayName) console.log(`display name: ${displayName}`);
  if (description) console.log(`description: ${description}`);
  if (description && description.includes("\n")) console.log();
  if (homepage) console.log(`homepage: ${homepage}`);
  if (keywords) console.log(`keywords: ${keywords.join(", ")}`);

  if (dist) {
    console.log();
    console.log("dist");
    console.log(`.tarball: ${dist.tarball}`);
    if (dist.shasum) console.log(`.shasum: ${dist.shasum}`);
    if (dist.integrity) console.log(`.integrity: ${dist.integrity}`);
  }

  if (dependencies && Object.keys(dependencies).length > 0) {
    console.log();
    console.log("dependencies");
    Object.keys(dependencies)
      .sort()
      .forEach(n => console.log(`${n} ${dependencies[n]}`));
  }

  console.log();
  console.log(`published at ${time}`);
};

module.exports = view;
