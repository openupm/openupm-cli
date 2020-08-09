const chalk = require("chalk");

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
  const envOk = await parseEnv(options, { checkPath: false });
  if (!envOk) return 1;
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
  const latest = pkg["dist-tags"].latest;

  console.log();
  console.log(
    chalk.greenBright(pkg.name) +
      "@" +
      chalk.greenBright(ver) +
      " | " +
      chalk.green(license) +
      " | versions: " +
      chalk.yellow(versionCount)
  );
  console.log();
  if (displayName) console.log(chalk.greenBright(displayName));
  if (description) console.log(description);
  if (description && description.includes("\n")) console.log();
  if (homepage) console.log(chalk.cyan(homepage));
  if (keywords) console.log(`keywords: ${keywords.join(", ")}`);

  if (dist) {
    console.log();
    console.log("dist");
    console.log(".tarball: " + chalk.cyan(dist.tarball));
    if (dist.shasum) console.log(".shasum: " + chalk.yellow(dist.shasum));
    if (dist.integrity)
      console.log(".integrity: " + chalk.yellow(dist.integrity));
  }

  if (dependencies && Object.keys(dependencies).length > 0) {
    console.log();
    console.log("dependencies");
    Object.keys(dependencies)
      .sort()
      .forEach(n => console.log(chalk.yellow(n) + ` ${dependencies[n]}`));
  }

  console.log();
  console.log("latest: " + chalk.greenBright(latest));

  console.log();
  console.log("published at " + chalk.yellow(time));
};

module.exports = view;
