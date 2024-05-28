import * as os from "os";
import { ParseEnvService } from "../services/parse-env";
import { CmdOptions } from "./options";
import { formatAsTable } from "./output-formatting";
import { Logger } from "npmlog";
import { SearchPackages } from "../services/search-packages";
import { DebugLog } from "../logging";
import { ResultCodes } from "./result-codes";
import { notifyEnvParsingFailed } from "./error-logging";

/**
 * The possible result codes with which the search command can exit.
 */
export type SearchResultCode = ResultCodes.Ok | ResultCodes.Error;

export type SearchOptions = CmdOptions;

/**
 * Cmd-handler for searching the registry.
 * @param keyword The keyword to search for.
 * @param options Command options.
 */
export type SearchCmd = (
  keyword: string,
  options: SearchOptions
) => Promise<SearchResultCode>;

/**
 * Makes a {@link SearchCmd} function.
 */
export function makeSearchCmd(
  parseEnv: ParseEnvService,
  searchPackages: SearchPackages,
  log: Logger,
  debugLog: DebugLog
): SearchCmd {
  return async (keyword, options) => {
    // parse env
    const envResult = await parseEnv(options);
    if (envResult.isErr()) {
      notifyEnvParsingFailed(log, envResult.error);
      return ResultCodes.Error;
    }
    const env = envResult.value;

    let usedEndpoint = "npmsearch";
    const searchResult = await searchPackages(env.registry, keyword, () => {
      usedEndpoint = "endpoint.all";
      log.warn("", "fast search endpoint is not available, using old search.");
    }).promise;

    if (searchResult.isErr()) {
      log.warn("", "/-/all endpoint is not available");
      return ResultCodes.Error;
    }

    const results = searchResult.value;
    if (results.length === 0) {
      log.notice("", `No matches found for "${keyword}"`);
      return ResultCodes.Ok;
    }

    debugLog(`${usedEndpoint}: ${results.map((it) => it.name).join(os.EOL)}`);
    console.log(formatAsTable(results));
    return ResultCodes.Ok;
  };
}
