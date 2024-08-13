import assert from "assert";
import chalk from "chalk";
import { Logger } from "npmlog";
import { PackumentNotFoundError } from "../common-errors";
import {
  hasVersion,
  PackageReference,
  splitPackageReference,
} from "../domain/package-reference";
import { tryGetLatestVersion, UnityPackument } from "../domain/packument";
import { unityRegistry } from "../domain/registry";
import { GetRegistryPackument } from "../io/packument-io";
import { GetRegistryAuth } from "../services/get-registry-auth";
import { ParseEnv } from "../services/parse-env";
import { recordKeys } from "../utils/record-utils";
import { queryAllRegistriesLazy } from "../utils/sources";
import { CmdOptions } from "./options";
import { ResultCodes } from "./result-codes";

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
  getRegistryPackument: GetRegistryPackument,
  getRegistryAuth: GetRegistryAuth,
  log: Logger
): ViewCmd {
  return async (pkg, options) => {
    // parse env
    const env = await parseEnv(options);
    const primaryRegistry = await getRegistryAuth(
      env.systemUser,
      env.primaryRegistryUrl
    );

    // parse name
    if (hasVersion(pkg)) {
      const [name] = splitPackageReference(pkg);
      log.warn("", `please do not specify a version (Write only '${name}').`);
      return ResultCodes.Error;
    }

    // verify name
    const sources = [primaryRegistry, ...(env.upstream ? [unityRegistry] : [])];
    const packumentFromRegistry = await queryAllRegistriesLazy(
      sources,
      (source) => getRegistryPackument(source, pkg)
    );
    const packument = packumentFromRegistry?.value ?? null;
    if (packument === null) throw new PackumentNotFoundError(pkg);

    printInfo(packument);
    return ResultCodes.Ok;
  };
}
