import npmSearch, { Options } from "libnpmsearch";
import npmFetch from "npm-registry-fetch";
import Table from "cli-table";
import log from "./logger";
import { is404Error, isHttpError } from "./utils/error-type-guards";
import * as os from "os";
import assert from "assert";
import { tryGetLatestVersion, UnityPackument } from "./types/packument";
import { parseEnv } from "./utils/env";
import { DomainName } from "./types/domain-name";
import { SemanticVersion } from "./types/semantic-version";
import { CmdOptions } from "./types/options";
import { Registry } from "./registry-client";

type DateString = string;

type TableRow = [DomainName, SemanticVersion, DateString, ""];

type SearchResultCode = 0 | 1;

export type SearchOptions = CmdOptions;

export type SearchedPackument = Omit<UnityPackument, "versions"> & {
  versions: Record<SemanticVersion, "latest">;
};

export type OldSearchResult =
  | SearchedPackument[]
  | Record<DomainName, SearchedPackument>;

/**
 * Get npm fetch options
 * @param registry The registry for which to get the options
 */
const getNpmFetchOptions = function (registry: Registry): Options {
  const opts: Options = {
    log,
    registry: registry.url,
  };
  const auth = registry.auth;
  if (auth !== null) Object.assign(opts, auth);
  return opts;
};

const searchEndpoint = async function (
  registry: Registry,
  keyword: string
): Promise<TableRow[] | undefined> {
  try {
    // NOTE: The results of the search will be Packument objects so we can change the type
    const results = <SearchedPackument[]>(
      await npmSearch(keyword, getNpmFetchOptions(registry))
    );
    log.verbose("npmsearch", results.join(os.EOL));
    return results.map(getTableRow);
  } catch (err) {
    if (isHttpError(err) && !is404Error(err)) {
      log.error("", err.message);
    }
    log.warn("", "fast search endpoint is not available, using old search.");
  }
};

const searchOld = async function (
  registry: Registry,
  keyword: string
): Promise<TableRow[] | undefined> {
  // all endpoint
  try {
    const results = <OldSearchResult | undefined>(
      await npmFetch.json("/-/all", getNpmFetchOptions(registry))
    );
    let objects: SearchedPackument[] = [];
    if (results) {
      if (Array.isArray(results)) {
        // results is an array of objects
        objects = results;
      } else {
        // results is an object
        if ("_updated" in results) delete results["_updated"];
        objects = Object.values(results);
      }
    }
    log.verbose("endpoint.all", objects.join(os.EOL));
    // prepare rows
    const rows = objects.map((packument) => {
      return getTableRow(packument);
    });
    // filter keyword
    const klc = keyword.toLowerCase();
    return rows.filter(
      (row) => row.filter((x) => x.toLowerCase().includes(klc)).length > 0
    );
  } catch (err) {
    if (isHttpError(err) && !is404Error(err)) {
      log.error("", err.message);
    }
    log.warn("", "/-/all endpoint is not available");
  }
};

const getTable = function () {
  return new Table({
    head: ["Name", "Version", "Date"],
    colWidths: [42, 20, 12],
  });
};

const getTableRow = function (packument: SearchedPackument): TableRow {
  const name = packument.name;
  const version = tryGetLatestVersion(packument);
  let date = "";
  if (packument.time && packument.time.modified)
    date = packument.time.modified.split("T")[0]!;
  if (packument.date) {
    date = packument.date.toISOString().slice(0, 10);
  }
  assert(version !== undefined);
  return [name, version, date, ""];
};

export async function search(
  keyword: string,
  options: SearchOptions
): Promise<SearchResultCode> {
  // parse env
  const env = await parseEnv(options, false);
  if (env === null) return 1;

  const table = getTable();
  // search endpoint
  let results = await searchEndpoint(env.registry, keyword);
  // search old search
  if (results === undefined) {
    results = (await searchOld(env.registry, keyword)) || [];
  }
  // search upstream
  if (results && results.length) {
    results.forEach((x) => table.push(x.slice(0, -1)));
    console.log(table.toString());
  } else log.notice("", `No matches found for "${keyword}"`);
  return 0;
}
