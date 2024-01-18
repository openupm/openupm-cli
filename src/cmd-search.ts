import npmSearch, { Options } from "libnpmsearch";
import npmFetch from "npm-registry-fetch";
import log from "./logger";
import { is404Error, isHttpError } from "./utils/error-type-guards";
import * as os from "os";
import { UnityPackument } from "./types/packument";
import { parseEnv } from "./utils/env";
import { DomainName } from "./types/domain-name";
import { SemanticVersion } from "./types/semantic-version";
import { CmdOptions } from "./types/options";
import { Registry } from "./registry-client";
import { formatAsTable } from "./output-formatting";

type SearchResultCode = 0 | 1;

export type SearchOptions = CmdOptions;

type SearchedPackument = Omit<UnityPackument, "versions"> & {
  versions: Record<SemanticVersion, "latest">;
};

type OldSearchResult =
  | SearchedPackument[]
  | Record<DomainName, SearchedPackument>;

/**
 * Get npm fetch options.
 * @param registry The registry for which to get the options.
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
): Promise<SearchedPackument[] | undefined> {
  try {
    // NOTE: The results of the search will be Packument objects so we can change the type
    const results = <SearchedPackument[]>(
      await npmSearch(keyword, getNpmFetchOptions(registry))
    );
    log.verbose("npmsearch", results.join(os.EOL));
    return results;
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
): Promise<SearchedPackument[] | undefined> {
  // all endpoint
  try {
    const results = <OldSearchResult | undefined>(
      await npmFetch.json("/-/all", getNpmFetchOptions(registry))
    );
    let packuments = Array.of<SearchedPackument>();
    if (results) {
      if (Array.isArray(results)) {
        // results is an array of objects
        packuments = results;
      } else {
        // results is an object
        if ("_updated" in results) delete results["_updated"];
        packuments = Object.values(results);
      }
    }
    log.verbose("endpoint.all", packuments.join(os.EOL));
    // filter keyword
    const klc = keyword.toLowerCase();
    return packuments.filter((packument) =>
      packument.name.toLowerCase().includes(klc)
    );
  } catch (err) {
    if (isHttpError(err) && !is404Error(err)) {
      log.error("", err.message);
    }
    log.warn("", "/-/all endpoint is not available");
  }
};

export async function search(
  keyword: string,
  options: SearchOptions
): Promise<SearchResultCode> {
  // parse env
  const env = await parseEnv(options, false);
  if (env === null) return 1;

  // search endpoint
  let results = await searchEndpoint(env.registry, keyword);
  // search old search
  if (results === undefined) {
    results = await searchOld(env.registry, keyword);
  }
  // search upstream
  if (results !== undefined && results.length > 0) {
    console.log(formatAsTable(results));
  } else log.notice("", `No matches found for "${keyword}"`);
  return 0;
}
