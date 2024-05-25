import * as os from "os";
import { EnvParseError, ParseEnvService } from "../services/parse-env";
import { CmdOptions } from "./options";
import { formatAsTable } from "./output-formatting";
import { Ok, Result } from "ts-results-es";
import { HttpErrorBase } from "npm-registry-fetch/lib/errors";
import { Logger } from "npmlog";
import { SearchPackages } from "../services/search-packages";
import { logEnvParseError } from "./error-logging";

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

/**
 * Makes a {@link SearchCmd} function.
 */
export function makeSearchCmd(
  parseEnv: ParseEnvService,
  searchPackages: SearchPackages,
  log: Logger
): SearchCmd {
  return async (keyword, options) => {
    // parse env
    const envResult = await parseEnv(options);
    if (envResult.isErr()) {
      logEnvParseError(log, envResult.error);
      return envResult;
    }
    const env = envResult.value;

    let usedEndpoint = "npmsearch";
    const searchResult = await searchPackages(env.registry, keyword, () => {
      usedEndpoint = "endpoint.all";
      log.warn("", "fast search endpoint is not available, using old search.");
    }).promise;

    if (searchResult.isErr()) {
      log.warn("", "/-/all endpoint is not available");
      return searchResult;
    }

    const results = searchResult.value;
    if (results.length === 0) {
      log.notice("", `No matches found for "${keyword}"`);
      return Ok(undefined);
    }

    log.verbose(usedEndpoint, results.map((it) => it.name).join(os.EOL));
    console.log(formatAsTable(results));
    return Ok(undefined);
  };
}
