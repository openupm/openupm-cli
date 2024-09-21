import { Command } from "@commander-js/extra-typings";
import { Logger } from "npmlog";
import * as os from "os";
import { loadRegistryAuthUsing } from "../app/get-registry-auth";
import { searchPackagesUsing } from "../app/search-packages";
import { partialApply } from "../domain/fp-utils";
import { DebugLog } from "../domain/logging";
import { getHomePathFromEnv } from "../domain/special-paths";
import { getUserUpmConfigPathFor } from "../domain/upm-config";
import type { ReadTextFile } from "../io/fs";
import type { GetAllRegistryPackuments, SearchRegistry } from "../io/registry";
import { withErrorLogger } from "./error-logging";
import { primaryRegistryUrlOpt } from "./opt-registry";
import { systemUserOpt } from "./opt-system-user";
import { formatAsTable } from "./output-formatting";
import { ResultCodes } from "./result-codes";

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
    .argument("<keyword>", "The keyword to search")
    .addOption(primaryRegistryUrlOpt)
    .addOption(systemUserOpt)
    .aliases(["s", "se", "find"])
    .description("Search package by keyword")
    .action(
      withErrorLogger(log, async function (keyword, options) {
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
        const results = await searchPackages(primaryRegistry, keyword, () => {
          usedEndpoint = "endpoint.all";
          log.warn(
            "",
            "fast search endpoint is not available, using old search."
          );
        });

        if (results.length === 0) {
          log.notice("", `No matches found for "${keyword}"`);
          return process.exit(ResultCodes.Ok);
        }

        await debugLog(
          `${usedEndpoint}: ${results.map((it) => it.name).join(os.EOL)}`
        );
        log.notice("", formatAsTable(results));
      })
    );
}
