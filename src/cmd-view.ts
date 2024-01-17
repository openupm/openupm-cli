import chalk from "chalk";
import log from "./logger";
import assert from "assert";
import { tryGetLatestVersion, UnityPackument } from "./types/packument";
import { parseEnv } from "./utils/env";
import { fetchPackument, getNpmClient } from "./registry-client";
import { DomainName } from "./types/domain-name";
import {
  packageReference,
  PackageReference,
  splitPackageReference,
} from "./types/package-reference";
import { CmdOptions } from "./types/options";
import { recordKeys } from "./utils/record-utils";

export type ViewOptions = CmdOptions;

type ViewResultCode = 0 | 1;

export const view = async function (
  pkg: PackageReference,
  options: ViewOptions
): Promise<ViewResultCode> {
  // parse env
  const env = await parseEnv(options, false);
  if (env === null) return 1;
  const client = getNpmClient();

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
  let packument = await fetchPackument(env.registry, name, client);
  if (!packument && env.upstream)
    packument = await fetchPackument(env.upstreamRegistry, name, client);
  if (!packument) {
    log.error("404", `package not found: ${name}`);
    return 1;
  }
  // print info
  printInfo(packument);
  return 0;
};

const printInfo = function (packument: UnityPackument) {
  const versionCount = recordKeys(packument.versions).length;
  const ver = tryGetLatestVersion(packument);
  assert(ver !== undefined);
  const verInfo = packument.versions[ver]!;
  const license = verInfo.license || "proprietary or unlicensed";
  const displayName = verInfo.displayName;
  const description = verInfo.description || packument.description;
  const keywords = verInfo.keywords || packument.keywords;
  const homepage = verInfo.homepage;
  const dist = verInfo.dist;
  const dependencies = verInfo.dependencies;
  const latest = packument["dist-tags"]?.latest;
  let time = packument.time.modified;
  if (!time && latest && latest in packument.time)
    time = packument.time[latest];

  console.log();
  console.log(
    chalk.greenBright(packument.name) +
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

  if (dependencies && recordKeys(dependencies).length > 0) {
    console.log();
    console.log("dependencies");
    recordKeys(dependencies)
      .sort()
      .forEach((n) => console.log(chalk.yellow(n) + ` ${dependencies[n]}`));
  }

  console.log();
  console.log("latest: " + chalk.greenBright(latest));

  console.log();
  console.log("published at " + chalk.yellow(time));

  console.log();
  console.log("versions:");
  for (const version in packument.versions) {
    console.log("  " + chalk.greenBright(version));
  }
};
