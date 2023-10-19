import npmSearch from "libnpmsearch";
import npmFetch from "npm-registry-fetch";
import Table from "cli-table";
import log from "./logger";
import { env, getLatestVersion, getNpmFetchOptions, parseEnv } from "./core";
import { is404Error } from "./error-handler";

type TableRow = [PkgName, PkgVersionName, string, ""];

export type SearchOptions = {
  _global: GlobalOptions;
};

const searchEndpoint = async function (
  keyword: string,
  registry?: Registry
): Promise<TableRow[] | undefined> {
  if (!registry) registry = env.registry;
  try {
    const results = await npmSearch(keyword, getNpmFetchOptions());
    // TODO: This should be converted to a string
    // @ts-ignore
    log.verbose("npmsearch", results);
    // TODO: Fix type error
    // @ts-ignore
    return results.map(getTableRow);
  } catch (err) {
    if (!is404Error(err)) {
      // TODO: Type check error
      // @ts-ignore
      log.error("", err.message);
    }
    log.warn("", "fast search endpoint is not available, using old search.");
  }
};

const searchOld = async function (
  keyword: string
): Promise<TableRow[] | undefined> {
  // all endpoint
  try {
    const results = await npmFetch.json("/-/all", getNpmFetchOptions());
    // TODO: This should be converted to a string
    // @ts-ignore
    log.verbose("endpoint.all", results);
    let objects: PkgInfo[] = [];
    if (results) {
      if (Array.isArray(results)) {
        // results is an array of objects
        objects = results;
      } else {
        // results is an object
        if ("_updated" in results) delete results["_updated"];
        // TODO: Do better type checking
        // @ts-ignore
        objects = Object.values(results);
      }
    }
    // prepare rows
    const rows = objects.map((pkg) => {
      return getTableRow(pkg);
    });
    // filter keyword
    const klc = keyword.toLowerCase();
    return rows.filter(
      (row) => row.filter((x) => x.toLowerCase().includes(klc)).length > 0
    );
  } catch (err) {
    if (!is404Error(err)) {
      // TODO: Type-check error
      // @ts-ignore
      log.error("", err.message);
    }
    log.warn("", "/-/all endpoint is not available");
  }
};

const getTable = function () {
  const table = new Table({
    head: ["Name", "Version", "Date"],
    colWidths: [42, 20, 12],
  });
  return table;
};

const getTableRow = function (pkg: PkgInfo): TableRow {
  const name = pkg.name;
  const version = getLatestVersion(pkg);
  let date = "";
  if (pkg.time && pkg.time.modified) date = pkg.time.modified.split("T")[0];
  if (pkg.date) {
    date = pkg.date.toISOString().slice(0, 10);
  }
  return [name, version, date, ""];
};

export async function search(keyword: string, options: SearchOptions) {
  // parse env
  const envOk = await parseEnv(options, { checkPath: false });
  if (!envOk) return 1;
  const table = getTable();
  // search endpoint
  let results = await searchEndpoint(keyword);
  // search old search
  if (results === undefined) {
    results = (await searchOld(keyword)) || [];
  }
  // search upstream
  // if (env.upstream) {
  //   const upstreamResults =
  //     (await searchEndpoint(keyword, env.upstreamRegistry)) || [];
  //   results.push(...upstreamResults);
  // }
  if (results && results.length) {
    results.forEach((x) => table.push(x.slice(0, -1)));
    console.log(table.toString());
  } else log.notice("", `No matches found for "${keyword}"`);
  return 0;
}
