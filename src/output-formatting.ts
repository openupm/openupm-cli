import Table from "cli-table";
import {
  tryGetLatestVersion,
  UnityPackument,
  VersionedPackument,
} from "./types/packument";
import assert from "assert";

/**
 * A type describing the minimum required properties of a packument
 * for being able to be formatted as a table.
 */
type TableablePackument = Pick<UnityPackument, "name" | "time" | "date"> &
  VersionedPackument;

/**
 * Formats an array of packuments as a table. The table is returned
 * as a single string (Includes line breaks).
 * @param packuments The packuments
 */
export function formatAsTable(packuments: TableablePackument[]): string {
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
    assert(version !== undefined);
    return [name, version, date];
  }

  const rows = packuments.map(getTableRow);
  rows.forEach((row) => table.push(row));
  return table.toString();
}
