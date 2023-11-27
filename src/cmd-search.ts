import npmSearch, { Options } from "libnpmsearch";
import npmFetch from "npm-registry-fetch";
import Table from "cli-table";
import log from "./logger";
import { is404Error, isHttpError } from "./utils/error-type-guards";
import * as os from "os";
import assert from "assert";
import { GlobalOptions, PkgInfo } from "./types/global";
import { tryGetLatestVersion } from "./utils/pkg-info";
import { env, parseEnv } from "./utils/env";
import { DomainName } from "./types/domain-name";
import { SemanticVersion } from "./types/semantic-version";
import { RegistryUrl } from "./types/registry-url";

type DateString = string;

type TableRow = [DomainName, SemanticVersion, DateString, ""];

export type SearchOptions = {
  _global: GlobalOptions;
};

export type SearchedPkgInfo = Omit<PkgInfo, "versions"> & {
  versions: Record<SemanticVersion, "latest">;
};

export type OldSearchResult =
  | SearchedPkgInfo[]
  | Record<DomainName, SearchedPkgInfo>;

// Get npm fetch options
const getNpmFetchOptions = function (): Options {
  const opts: Options = {
    log,
    registry: env.registry,
  };
  const auth = env.auth[env.registry];
  if (auth) Object.assign(opts, auth);
  return opts;
};

const searchEndpoint = async function (
  keyword: string,
  registry?: RegistryUrl
): Promise<TableRow[] | undefined> {
  if (!registry) registry = env.registry;
  try {
    // NOTE: The results of the search will be PkgInfo objects so we can change the type
    const results = <SearchedPkgInfo[]>(
      await npmSearch(keyword, getNpmFetchOptions())
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
  keyword: string
): Promise<TableRow[] | undefined> {
  // all endpoint
  try {
    const results = <OldSearchResult | undefined>(
      await npmFetch.json("/-/all", getNpmFetchOptions())
    );
    let objects: SearchedPkgInfo[] = [];
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
    const rows = objects.map((pkg) => {
      return getTableRow(pkg);
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

const getTableRow = function (pkg: SearchedPkgInfo): TableRow {
  const name = pkg.name;
  const version = tryGetLatestVersion(pkg);
  let date = "";
  if (pkg.time && pkg.time.modified) date = pkg.time.modified.split("T")[0];
  if (pkg.date) {
    date = pkg.date.toISOString().slice(0, 10);
  }
  assert(version !== undefined);
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
