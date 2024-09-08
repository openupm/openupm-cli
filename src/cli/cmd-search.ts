import { Logger } from "npmlog";
import * as os from "os";
import { loadRegistryAuthUsing } from "../app/get-registry-auth";
import { searchPackagesUsing } from "../app/search-packages";
import { getUserUpmConfigPathFor } from "../domain/upm-config";
import type { GetAllRegistryPackuments } from "../io/all-packuments-io";
import type { SearchRegistry } from "../io/npm-search";
import { getHomePathFromEnv } from "../domain/special-paths";
import type { ReadTextFile } from "../io/text-file-io";
import { DebugLog } from "../domain/logging";
import { partialApply } from "../domain/fp-utils";
import { CmdOptions } from "./options";
import { formatAsTable } from "./output-formatting";
import { parseEnvUsing } from "./parse-env";
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
  readTextFile: ReadTextFile,
  searchRegistry: SearchRegistry,
  fetchAllPackuments: GetAllRegistryPackuments,
  log: Logger,
  debugLog: DebugLog
): SearchCmd {
  const searchPackages = partialApply(
    searchPackagesUsing,
    searchRegistry,
    fetchAllPackuments,
    debugLog
  );

  return async (keyword, options) => {
    // parse env
    const env = await parseEnvUsing(log, process.env, process.cwd(), options);
    const homePath = getHomePathFromEnv(process.env);
    const upmConfigPath = getUserUpmConfigPathFor(
      process.env,
      homePath,
      env.systemUser
    );

    const primaryRegistry = await loadRegistryAuthUsing(
      readTextFile,
      debugLog,
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

    await debugLog(
      `${usedEndpoint}: ${results.map((it) => it.name).join(os.EOL)}`
    );
    log.notice("", formatAsTable(results));
    return ResultCodes.Ok;
  };
}
