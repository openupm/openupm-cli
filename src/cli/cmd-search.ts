import { Command } from "@commander-js/extra-typings";
import { Logger } from "npmlog";
import * as os from "os";
import { loadRegistryAuthUsing } from "../app/get-registry-auth.js";
import { searchPackagesUsing } from "../app/search-packages.js";
import { partialApply } from "../domain/fp-utils.js";
import { DebugLog } from "../domain/logging.js";
import { getHomePathFromEnv } from "../domain/special-paths.js";
import { getUserUpmConfigPathFor } from "../domain/upm-config.js";
import type { ReadTextFile } from "../io/fs.js";
import type { GetAllRegistryPackuments, SearchRegistry } from "../io/registry.js";
import { withErrorLogger } from "./error-logging.js";
import { primaryRegistryUrlOpt } from "./opt-registry.js";
import { systemUserOpt } from "./opt-system-user.js";
import { formatAsTable } from "./output-formatting.js";
import { ResultCodes } from "./result-codes.js";

/**
 * Makes the `openupm search` cli command with the given dependencies.
 * @param readTextFile IO function for reading a text file.
 * @param searchRegistry IO function for sending a search request to a
 * registry.
 * @param fetchAllPackuments IO function for getting all packages from a
 * registry.
 * @param log Logger for cli output.
 * @param debugLog IO function for debug-logs.
 * @returns The command.
 */
export function makeSearchCmd(
  readTextFile: ReadTextFile,
  searchRegistry: SearchRegistry,
  fetchAllPackuments: GetAllRegistryPackuments,
  log: Logger,
  debugLog: DebugLog
) {
  const getRegistryAuth = partialApply(
    loadRegistryAuthUsing,
    readTextFile,
    debugLog
  );

  const searchPackages = partialApply(
    searchPackagesUsing,
    searchRegistry,
    fetchAllPackuments,
    debugLog
  );

  return new Command("search")
    .argument("<search term>", "The term to search for")
    .addOption(primaryRegistryUrlOpt)
    .addOption(systemUserOpt)
    .aliases(["s", "se", "find"])
    .summary("search packages matching a term")
    .description(`Search all packages matching a given search term.
openupm search math`)
    .action(
      withErrorLogger(log, async function (searchTerm, options) {
        const homePath = getHomePathFromEnv(process.env);
        const upmConfigPath = getUserUpmConfigPathFor(
          process.env,
          homePath,
          options.systemUser
        );

        const primaryRegistry = await getRegistryAuth(
          upmConfigPath,
          options.registry
        );

        let usedEndpoint = "npmsearch";
        const results = await searchPackages(
          primaryRegistry,
          searchTerm,
          () => {
            usedEndpoint = "endpoint.all";
            log.warn(
              "",
              "fast search endpoint is not available, using old search."
            );
          }
        );

        if (results.length === 0) {
          log.notice("", `No matches found for "${searchTerm}"`);
          return process.exit(ResultCodes.Ok);
        }

        await debugLog(
          `${usedEndpoint}: ${results.map((it) => it.name).join(os.EOL)}`
        );
        log.notice("", formatAsTable(results));
      })
    );
}
