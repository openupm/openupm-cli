import chalk from "chalk";
import assert from "assert";
import { tryGetLatestVersion, UnityPackument } from "../domain/packument";
import { ParseEnv } from "../services/parse-env";
import {
  hasVersion,
  PackageReference,
  splitPackageReference,
} from "../domain/package-reference";
import { CmdOptions } from "./options";
import { recordKeys } from "../utils/record-utils";
import { Logger } from "npmlog";
import { ResultCodes } from "./result-codes";
import { FetchPackument } from "../io/packument-io";
import { queryAllRegistriesLazy } from "../utils/sources";
import { PackumentNotFoundError } from "../common-errors";

/**
 * Options passed to the view command.
 */
export type ViewOptions = CmdOptions;

/**
 * The possible result codes with which the view command can exit.
 */
export type ViewResultCode = ResultCodes.Ok | ResultCodes.Error;

/**
 * Cmd-handler for viewing package information.
 * @param pkg Reference to the package to view.
 * @param options Command options.
 */
export type ViewCmd = (
  pkg: PackageReference,
  options: ViewOptions
) => Promise<ViewResultCode>;

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
  let time = packument.time?.modified;
  if (
    !time &&
    latest &&
    packument.time !== undefined &&
    latest in packument.time
  )
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

/**
 * Makes a {@link ViewCmd} function.
 */
export function makeViewCmd(
  parseEnv: ParseEnv,
  fetchPackument: FetchPackument,
  log: Logger
): ViewCmd {
  return async (pkg, options) => {
    // parse env
    const env = await parseEnv(options);

    // parse name
    if (hasVersion(pkg)) {
      const [name] = splitPackageReference(pkg);
      log.warn("", `please do not specify a version (Write only '${name}').`);
      return ResultCodes.Error;
    }

    // verify name
    const sources = [
      env.registry,
      ...(env.upstream ? [env.upstreamRegistry] : []),
    ];
    const packumentFromRegistry = await queryAllRegistriesLazy(
      sources,
      (source) => fetchPackument(source, pkg)
    );
    const packument = packumentFromRegistry?.value ?? null;
    if (packument === null) throw new PackumentNotFoundError(pkg);

    printInfo(packument);
    return ResultCodes.Ok;
  };
}
