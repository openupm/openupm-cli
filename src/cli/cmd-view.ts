import { Command } from "@commander-js/extra-typings";
import { Logger } from "npmlog";
import { EOL } from "os";
import { loadRegistryAuthUsing } from "../app/get-registry-auth.js";
import { queryAllRegistriesLazy } from "../app/query-registries.js";
import { PackumentNotFoundError } from "../domain/common-errors.js";
import { partialApply } from "../domain/fp-utils.js";
import type { DebugLog } from "../domain/logging.js";
import { hasVersion, splitPackageSpec } from "../domain/package-spec.js";
import { unityRegistry } from "../domain/registry.js";
import { getHomePathFromEnv } from "../domain/special-paths.js";
import { getUserUpmConfigPathFor } from "../domain/upm-config.js";
import type { ReadTextFile } from "../io/fs.js";
import type { GetRegistryPackument } from "../io/registry.js";
import { withErrorLogger } from "./error-logging.js";
import { primaryRegistryUrlOpt } from "./opt-registry.js";
import { systemUserOpt } from "./opt-system-user.js";
import { upstreamOpt } from "./opt-upstream.js";
import { formatPackumentInfo } from "./output-formatting.js";
import { ResultCodes } from "./result-codes.js";
import { mustBePackageSpec } from "./validators.js";

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
  const getRegistryAuth = partialApply(
    loadRegistryAuthUsing,
    readTextFile,
    debugLog
  );

  return new Command("view")
    .argument("<package-spec>", "Spec of a package", mustBePackageSpec)
    .addOption(primaryRegistryUrlOpt)
    .addOption(systemUserOpt)
    .addOption(upstreamOpt)
    .aliases(["v", "info", "show"])
    .summary("view package information")
    .description(
      `Print information about a remote package.
openupm view com.some.package`
    )
    .action(
      withErrorLogger(log, async function (packageSpec, options) {
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

        // parse name
        if (hasVersion(packageSpec)) {
          const [name] = splitPackageSpec(packageSpec);
          log.warn(
            "",
            `please do not specify a version (Write only '${name}').`
          );
          return process.exit(ResultCodes.Error);
        }

        // verify name
        const sources = [
          primaryRegistry,
          ...(options.upstream ? [unityRegistry] : []),
        ];
        const packumentFromRegistry = await queryAllRegistriesLazy(
          sources,
          (source) => getRegistryPackument(source, packageSpec)
        );
        const packument = packumentFromRegistry?.value ?? null;
        if (packument === null) throw new PackumentNotFoundError(packageSpec);

        const output = formatPackumentInfo(packument, EOL);
        log.notice("", output);
        return process.exit(ResultCodes.Ok);
      })
    );
}
