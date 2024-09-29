import assert from "assert";
import chalk from "chalk";
import Table from "cli-table";
import {
  tryGetLatestVersion,
  UnityPackument,
  VersionedPackument,
} from "../domain/packument";
import { recordKeys } from "../domain/record-utils";

/**
 * A type describing the minimum required properties of a packument
 * for being able to be formatted as a table.
 */
type TableablePackument = Pick<UnityPackument, "name" | "time" | "date"> &
  VersionedPackument;

/**
 * Formats an array of packuments as a table. The table is returned
 * as a single string (Includes line breaks).
 * @param packuments The packuments.
 */
export function formatAsTable(
  packuments: ReadonlyArray<TableablePackument>
): string {
  const table = new Table({
    head: ["Name", "Version", "Date"],
    colWidths: [42, 20, 12],
  });

  function getTableRow(
    packument: TableablePackument
  ): [string, string, string] {
    const name = packument.name;
    const version = tryGetLatestVersion(packument);
    let date = "";
    if (packument.time && packument.time.modified)
      date = packument.time.modified.split("T")[0]!;
    if (packument.date) {
      date = packument.date.toISOString().slice(0, 10);
    }
    assert(version !== null);
    return [name, version, date];
  }

  const rows = packuments.map(getTableRow);
  rows.forEach((row) => table.push(row));
  return table.toString();
}

/**
 * Creates a string from a packument containing relevant information. This can
 * be printed to the console.
 *
 * The string is multiline.
 * @param packument The packument to format.
 * @param eol The string to use to delimit lines, for example {@link import("os").EOL}.
 * @returns The formatted string.
 */
export function formatPackumentInfo(
  packument: UnityPackument,
  eol: string
): string {
  let output = "";

  const versionCount = recordKeys(packument.versions).length;
  const ver = tryGetLatestVersion(packument);
  assert(ver !== null);
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

  output += eol;
  output += `${chalk.greenBright(packument.name)}@${chalk.greenBright(
    ver
  )} | ${chalk.green(license)} | versions: ${chalk.yellow(
    versionCount
  )}${eol}${eol}`;

  if (displayName) output += chalk.greenBright(displayName) + eol;
  if (description) output += description + eol;
  if (description && description.includes("\n")) output += eol;
  if (homepage) output += chalk.cyan(homepage) + eol;
  if (keywords) output += `keywords: ${keywords.join(", ")}` + eol;

  if (dist) {
    output += eol;
    output += `dist${eol}`;
    output += `.tarball: ${chalk.cyan(dist.tarball)}${eol}`;
    if (dist.shasum) output += `.shasum: ${chalk.yellow(dist.shasum)}${eol}`;
    if (dist.integrity)
      output += `.integrity: ${chalk.yellow(dist.integrity)}${eol}`;
  }

  if (dependencies && recordKeys(dependencies).length > 0) {
    output += eol;
    output += `dependencies${eol}`;
    output += recordKeys(dependencies)
      .sort()
      .reduce(
        (acc, dependencyName) =>
          `${acc + chalk.yellow(dependencyName)} ${
            dependencies[dependencyName]
          }${eol}`,
        ""
      );
  }

  output += eol;
  output += `latest: ${chalk.greenBright(latest)}${eol}`;

  output += eol;
  output += `published at ${chalk.yellow(time)}${eol}`;

  output += eol;
  output += `versions:${eol}${Object.keys(packument.versions)
    .map((version) => "  " + chalk.greenBright(version))
    .join(eol)}`;

  return output;
}
