import log from "./logger";
import * as os from "os";
import { EnvParseError, ParseEnvService } from "../services/parse-env";
import { CmdOptions } from "./options";
import { formatAsTable } from "./output-formatting";
import { AsyncResult, Ok, Result } from "ts-results-es";
import { HttpErrorBase } from "npm-registry-fetch";
import {
  SearchedPackument,
  SearchRegistryService,
} from "../services/search-registry";
import { Registry } from "../domain/registry";
import { GetAllPackumentsService } from "../services/get-all-packuments";

export type SearchError = EnvParseError | HttpErrorBase;

export type SearchOptions = CmdOptions;

/**
 * Cmd-handler for searching the registry.
 * @param keyword The keyword to search for.
 * @param options Command options.
 */
export type SearchCmd = (
  keyword: string,
  options: SearchOptions
) => Promise<Result<void, SearchError>>;

const searchEndpoint = function (
  searchRegistry: SearchRegistryService,
  registry: Registry,
  keyword: string
): AsyncResult<ReadonlyArray<SearchedPackument>, HttpErrorBase> {
  return searchRegistry(registry, keyword).map((results) => {
    log.verbose("npmsearch", results.join(os.EOL));
    return results;
  });
};

const searchOld = function (
  getAllPackuments: GetAllPackumentsService,
  registry: Registry,
  keyword: string
): AsyncResult<SearchedPackument[], HttpErrorBase> {
  return getAllPackuments(registry).map((allPackuments) => {
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

/**
 * Makes a {@link SearchCmd} function.
 */
export function makeSearchCmd(
  parseEnv: ParseEnvService,
  searchRegistry: SearchRegistryService,
  getAllPackuments: GetAllPackumentsService
): SearchCmd {
  return async (keyword, options) => {
    // parse env
    const envResult = await parseEnv(options);
    if (envResult.isErr()) return envResult;
    const env = envResult.value;

    // search endpoint
    let result = await searchEndpoint(searchRegistry, env.registry, keyword)
      .promise;

    // search old search
    if (result.isErr()) {
      log.warn("", "fast search endpoint is not available, using old search.");
      result = await searchOld(getAllPackuments, env.registry, keyword).promise;
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
  };
}
