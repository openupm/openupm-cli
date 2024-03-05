import log from "./logger";
import * as os from "os";
import { parseEnv } from "./utils/env";
import { CmdOptions } from "./types/options";
import {
  getNpmClient,
  NpmClient,
  Registry,
  SearchedPackument,
} from "./registry-client";
import { formatAsTable } from "./output-formatting";

type SearchResultCode = 0 | 1;

export type SearchOptions = CmdOptions;

const searchEndpoint = async function (
  npmClient: NpmClient,
  registry: Registry,
  keyword: string
): Promise<SearchedPackument[] | null> {
  const results = await npmClient.trySearch(registry, keyword);

  if (results !== null) log.verbose("npmsearch", results.join(os.EOL));

  return results;
};

const searchOld = async function (
  npmClient: NpmClient,
  registry: Registry,
  keyword: string
): Promise<SearchedPackument[] | null> {
  const results = await npmClient.tryGetAll(registry);
  let packuments = Array.of<SearchedPackument>();

  if (results === null) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _updated, ...packumentEntries } = results;
  packuments = Object.values(packumentEntries);

  log.verbose("endpoint.all", packuments.join(os.EOL));

  // filter keyword
  const klc = keyword.toLowerCase();

  return packuments.filter((packument) =>
    packument.name.toLowerCase().includes(klc)
  );
};

export async function search(
  keyword: string,
  options: SearchOptions
): Promise<SearchResultCode> {
  // parse env
  const env = await parseEnv(options, false);
  if (env === null) return 1;

  const npmClient = getNpmClient();

  // search endpoint
  let results = await searchEndpoint(npmClient, env.registry, keyword);

  // search old search
  if (results === null) {
    log.warn("", "fast search endpoint is not available, using old search.");
    results = await searchOld(npmClient, env.registry, keyword);
  }

  if (results === null) log.warn("", "/-/all endpoint is not available");

  if (results === null || results.length === 0) {
    log.notice("", `No matches found for "${keyword}"`);
    return 0;
  }

  console.log(formatAsTable(results));
  return 0;
}
