import { Logger } from "npmlog";
import * as os from "os";
import { GetRegistryAuth } from "../app/get-registry-auth";
import { ParseEnv } from "../app/parse-env";
import { SearchPackages } from "../app/search-packages";
import { getUserUpmConfigPathFor } from "../domain/upm-config";
import { getHomePathFromEnv } from "../io/special-paths";
import { DebugLog } from "../logging";
import { CmdOptions } from "./options";
import { formatAsTable } from "./output-formatting";
import { ResultCodes } from "./result-codes";

/**
 * The possible result codes with which the search command can exit.
 */
export type SearchResultCode = ResultCodes.Ok | ResultCodes.Error;

/**
 * Options passed to the search command.
 */
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
  parseEnv: ParseEnv,
  searchPackages: SearchPackages,
  getRegistryAuth: GetRegistryAuth,
  log: Logger,
  debugLog: DebugLog
): SearchCmd {
  return async (keyword, options) => {
    // parse env
    const env = await parseEnv(options);
    const homePath = getHomePathFromEnv(process.env);
    const upmConfigPath = getUserUpmConfigPathFor(
      process.env,
      homePath,
      env.systemUser
    );

    const primaryRegistry = await getRegistryAuth(
      upmConfigPath,
      env.primaryRegistryUrl
    );

    let usedEndpoint = "npmsearch";
    const results = await searchPackages(primaryRegistry, keyword, () => {
      usedEndpoint = "endpoint.all";
      log.warn("", "fast search endpoint is not available, using old search.");
    });

    if (results.length === 0) {
      log.notice("", `No matches found for "${keyword}"`);
      return ResultCodes.Ok;
    }

    debugLog(`${usedEndpoint}: ${results.map((it) => it.name).join(os.EOL)}`);
    log.notice("", formatAsTable(results));
    return ResultCodes.Ok;
  };
}
