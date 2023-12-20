import chalk from "chalk";
import log from "./logger";
import assert from "assert";
import { PkgInfo, tryGetLatestVersion } from "./types/pkg-info";
import { parseEnv } from "./utils/env";
import { fetchPackageInfo } from "./registry-client";
import { DomainName } from "./types/domain-name";
import {
  packageReference,
  PackageReference,
  splitPackageReference,
} from "./types/package-reference";
import { CmdOptions } from "./types/options";

export type ViewOptions = CmdOptions;

export const view = async function (
  pkg: PackageReference,
  options: ViewOptions
) {
  // parse env
  const env = await parseEnv(options, false);
  if (env === null) return 1;
  // parse name
  const [name, version] = splitPackageReference(pkg);
  if (version) {
    log.warn(
      "",
      `please replace '${packageReference(name, version)}' with '${name}'`
    );
    return 1;
  }
  // verify name
  let pkgInfo = await fetchPackageInfo(env.registry, name);
  if (!pkgInfo && env.upstream)
    pkgInfo = await fetchPackageInfo(env.upstreamRegistry, name);
  if (!pkgInfo) {
    log.error("404", `package not found: ${name}`);
    return 1;
  }
  // print info
  printInfo(pkgInfo);
  return 0;
};

const printInfo = function (pkg: PkgInfo) {
  const versionCount = Object.keys(pkg.versions).length;
  const ver = tryGetLatestVersion(pkg);
  assert(ver !== undefined);
  const verInfo = pkg.versions[ver]!;
  const license = verInfo.license || "proprietary or unlicensed";
  const displayName = verInfo.displayName;
  const description = verInfo.description || pkg.description;
  const keywords = verInfo.keywords || pkg.keywords;
  const homepage = verInfo.homepage;
  const dist = verInfo.dist;
  const dependencies = verInfo.dependencies;
  const latest = pkg["dist-tags"]?.latest;
  let time = pkg.time.modified;
  if (!time && latest && latest in pkg.time) time = pkg.time[latest];

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
    (Object.keys(dependencies) as DomainName[])
      .sort()
      .forEach((n) => console.log(chalk.yellow(n) + ` ${dependencies[n]}`));
  }

  console.log();
  console.log("latest: " + chalk.greenBright(latest));

  console.log();
  console.log("published at " + chalk.yellow(time));

  console.log();
  console.log("versions:");
  for (const version in pkg.versions) {
    console.log("  " + chalk.greenBright(version));
  }
};
