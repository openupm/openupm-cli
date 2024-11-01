import { Argument, Command, Option } from "@commander-js/extra-typings";
import chalk from "chalk";
import { Logger } from "npmlog";
import os from "os";
import { fetchLatestPackumentVersionUsing } from "../app/get-latest-version.js";
import { loadRegistryAuthUsing } from "../app/get-registry-auth.js";
import { queryAllRegistriesLazy } from "../app/query-registries.js";
import { resolveDependenciesUsing } from "../app/resolve-dependencies.js";
import { PackumentNotFoundError } from "../domain/common-errors.js";
import { partialApply } from "../domain/fp-utils.js";
import { DebugLog } from "../domain/logging.js";
import { makePackageSpec, splitPackageSpec } from "../domain/package-spec.js";
import { PackageUrl } from "../domain/package-url.js";
import { unityRegistry } from "../domain/registry.js";
import { SemanticVersion } from "../domain/semantic-version.js";
import { getHomePathFromEnv } from "../domain/special-paths.js";
import { getUserUpmConfigPathFor } from "../domain/upm-config.js";
import { isZod } from "../domain/zod-utils.js";
import type { ReadTextFile } from "../io/fs.js";
import type { GetRegistryPackument } from "../io/registry.js";
import type { CheckUrlExists } from "../io/www.js";
import { stringifyDependencyGraph } from "./dependency-logging.js";
import { withErrorLogger } from "./error-logging.js";
import { primaryRegistryUrlOpt } from "./opt-registry.js";
import { systemUserOpt } from "./opt-system-user.js";
import { ResultCodes } from "./result-codes.js";
import { mustBePackageSpec } from "./validators.js";

const packageSpecArg = new Argument(
  "<package-spec>",
  "Spec of package for which to view dependencies"
).argParser(mustBePackageSpec);

const deepOpt = new Option(
  "-d, --deep",
  "view package dependencies recursively"
).default(false);

/**
 * Makes the `openupm deps` command with the given dependencies.
 * @param readTextFile IO function for reading text files.
 * @param fetchPackument IO function for fetching remote packuments.
 * @param checkUrlExists IO function for checking whether a url exists.
 * @param log Logger for printing output.
 * @param debugLog IO function for printing debug logs.
 */
export function makeDepsCmd(
  readTextFile: ReadTextFile,
  fetchPackument: GetRegistryPackument,
  checkUrlExists: CheckUrlExists,
  log: Logger,
  debugLog: DebugLog
) {
  const getRegistryAuth = partialApply(
    loadRegistryAuthUsing,
    readTextFile,
    debugLog
  );

  const getLatestVersion = partialApply(
    fetchLatestPackumentVersionUsing,
    fetchPackument
  );

  const resolveDependencies = partialApply(
    resolveDependenciesUsing,
    checkUrlExists,
    fetchPackument
  );

  return new Command("deps")
    .alias("dep")
    .addArgument(packageSpecArg)
    .addOption(deepOpt)
    .addOption(primaryRegistryUrlOpt)
    .addOption(systemUserOpt)
    .description(
      `view package dependencies
openupm deps <pkg>
openupm deps <pkg>@<version>`
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
        const sources = [primaryRegistry, unityRegistry];

        const [packageName, requestedVersion] = splitPackageSpec(packageSpec);

        if (requestedVersion !== null && isZod(requestedVersion, PackageUrl)) {
          log.error("", "cannot get dependencies for url-version");
          return process.exit(ResultCodes.Error);
        }

        const latestVersion =
          requestedVersion !== null && isZod(requestedVersion, SemanticVersion)
            ? requestedVersion
            : (
                await queryAllRegistriesLazy(sources, (source) =>
                  getLatestVersion(source, packageName)
                )
              )?.value ?? null;

        if (latestVersion === null)
          throw new PackumentNotFoundError(packageName);

        await debugLog(
          `fetch: ${makePackageSpec(packageName, latestVersion)}, deep=${
            options.deep
          }`
        );
        const dependencyGraph = await resolveDependencies(
          sources,
          packageName,
          latestVersion,
          options.deep
        );

        const output = stringifyDependencyGraph(
          dependencyGraph,
          packageName,
          latestVersion,
          chalk
        ).join(os.EOL);
        log.notice("", output);
      })
    );
}
