import chalk from "chalk";
import log from "./logger";
import assert from "assert";
import { tryGetLatestVersion, UnityPackument } from "./types/packument";
import { EnvParseError, parseEnv } from "./utils/env";
import { makeNpmClient } from "./npm-client";
import { hasVersion, PackageReference } from "./types/package-reference";
import { CmdOptions } from "./types/options";
import { recordKeys } from "./utils/record-utils";
import { Err, Ok, Result } from "ts-results-es";

import {
  PackageWithVersionError,
  PackumentNotFoundError,
} from "./common-errors";

export type ViewOptions = CmdOptions;

export type ViewError = EnvParseError | PackageWithVersionError;

export const view = async function (
  pkg: PackageReference,
  options: ViewOptions
): Promise<Result<void, ViewError>> {
  // parse env
  const envResult = await parseEnv(options);
  if (envResult.isErr()) return envResult;
  const env = envResult.value;

  const client = makeNpmClient();

  // parse name
  if (hasVersion(pkg)) {
    log.warn("", `please do not specify a version (Write only '${pkg}').`);
    return Err(new PackageWithVersionError());
  }
  // verify name
  return await client
    .tryFetchPackument(env.registry, pkg)
    .andThen(async (packument) => {
      if (packument === null && env.upstreamRegistry !== null)
        return await client.tryFetchPackument(env.upstreamRegistry, pkg)
          .promise;
      return Ok(packument);
    })
    .andThen((packument) => {
      if (packument === null) {
        log.error("404", `package not found: ${pkg}`);
        return Err(new PackumentNotFoundError());
      }
      return Ok(packument);
    })
    .map((packument) => {
      // print info
      printInfo(packument);
    }).promise;
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
