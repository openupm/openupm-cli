import log from "./logger";
import * as os from "os";
import { EnvParseError, parseEnv } from "../utils/env";
import { CmdOptions } from "./options";
import { formatAsTable } from "./output-formatting";
import { AsyncResult, Ok, Result } from "ts-results-es";
import { HttpErrorBase } from "npm-registry-fetch";
import {
  makeSearchService,
  SearchedPackument,
  SearchService,
} from "../services/search-service";
import { Registry } from "../domain/registry";

export type SearchError = EnvParseError | HttpErrorBase;

export type SearchOptions = CmdOptions;

const searchEndpoint = function (
  searchService: SearchService,
  registry: Registry,
  keyword: string
): AsyncResult<SearchedPackument[], HttpErrorBase> {
  return searchService.trySearch(registry, keyword).map((results) => {
    log.verbose("npmsearch", results.join(os.EOL));
    return results;
  });
};

const searchOld = function (
  searchService: SearchService,
  registry: Registry,
  keyword: string
): AsyncResult<SearchedPackument[], HttpErrorBase> {
  return searchService.tryGetAll(registry).map((allPackuments) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _updated, ...packumentEntries } = allPackuments;
    const packuments = Object.values(packumentEntries);

    log.verbose("endpoint.all", packuments.join(os.EOL));

    // filter keyword
    const klc = keyword.toLowerCase();

    return packuments.filter((packument) =>
      packument.name.toLowerCase().includes(klc)
    );
  });
};

export async function search(
  keyword: string,
  options: SearchOptions
): Promise<Result<void, SearchError>> {
  // parse env
  const envResult = await parseEnv(options);
  if (envResult.isErr()) return envResult;
  const env = envResult.value;

  const searchService = makeSearchService();

  // search endpoint
  let result = await searchEndpoint(searchService, env.registry, keyword)
    .promise;

  // search old search
  if (result.isErr()) {
    log.warn("", "fast search endpoint is not available, using old search.");
    result = await searchOld(searchService, env.registry, keyword).promise;
  }
  if (result.isErr()) {
    log.warn("", "/-/all endpoint is not available");
    return result;
  }

  const results = result.value;

  if (results.length === 0) {
    log.notice("", `No matches found for "${keyword}"`);
    return Ok(undefined);
  }

  console.log(formatAsTable(results));
  return Ok(undefined);
}
