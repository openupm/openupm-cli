import { Command } from "@commander-js/extra-typings";
import { Logger } from "npmlog";
import { EOL } from "os";
import { loadRegistryAuthUsing } from "../app/get-registry-auth";
import { queryAllRegistriesLazy } from "../app/query-registries";
import { PackumentNotFoundError } from "../domain/common-errors";
import type { DebugLog } from "../domain/logging";
import { hasVersion, splitPackageReference } from "../domain/package-reference";
import { unityRegistry } from "../domain/registry";
import { getHomePathFromEnv } from "../domain/special-paths";
import { getUserUpmConfigPathFor } from "../domain/upm-config";
import type { ReadTextFile } from "../io/fs";
import type { GetRegistryPackument } from "../io/registry";
import { withErrorLogger } from "./error-logging";
import { primaryRegistryUrlOpt } from "./opt-registry";
import { systemUserOpt } from "./opt-system-user";
import { GlobalOptions } from "./options";
import { formatPackumentInfo } from "./output-formatting";
import { parseEnvUsing } from "./parse-env";
import { ResultCodes } from "./result-codes";
import { mustBePackageReference } from "./validators";

/**
 * Makes the `openupm view` cli command with the given dependencies.
 * @param getRegistryPackument IO function for fetching registry packages.
 * @param readTextFile IO function for reading a text file.
 * @param debugLog IO function for debug-logs.
 * @param log Logger for cli output.
 * @returns The command.
 */
export function makeViewCmd(
  getRegistryPackument: GetRegistryPackument,
  readTextFile: ReadTextFile,
  debugLog: DebugLog,
  log: Logger
) {
  return new Command("view")
    .argument("<pkg>", "Reference to a package", mustBePackageReference)
    .addOption(primaryRegistryUrlOpt)
    .addOption(systemUserOpt)
    .aliases(["v", "info", "show"])
    .description("view package information")
    .action(
      withErrorLogger(log, async function (pkg, viewOptions, cmd) {
        const globalOptions = cmd.optsWithGlobals<GlobalOptions>();

        // parse env
        const env = await parseEnvUsing(log, process.env, globalOptions);
        const homePath = getHomePathFromEnv(process.env);
        const upmConfigPath = getUserUpmConfigPathFor(
          process.env,
          homePath,
          viewOptions.systemUser
        );

        const primaryRegistry = await loadRegistryAuthUsing(
          readTextFile,
          debugLog,
          upmConfigPath,
          viewOptions.registry
        );

        // parse name
        if (hasVersion(pkg)) {
          const [name] = splitPackageReference(pkg);
          log.warn(
            "",
            `please do not specify a version (Write only '${name}').`
          );
          return process.exit(ResultCodes.Error);
        }

        // verify name
        const sources = [
          primaryRegistry,
          ...(env.upstream ? [unityRegistry] : []),
        ];
        const packumentFromRegistry = await queryAllRegistriesLazy(
          sources,
          (source) => getRegistryPackument(source, pkg)
        );
        const packument = packumentFromRegistry?.value ?? null;
        if (packument === null) throw new PackumentNotFoundError(pkg);

        const output = formatPackumentInfo(packument, EOL);
        log.notice("", output);
        return process.exit(ResultCodes.Ok);
      })
    );
}
