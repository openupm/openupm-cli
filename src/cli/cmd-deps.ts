import { Argument, Command, Option } from "@commander-js/extra-typings";
import chalk from "chalk";
import { Logger } from "npmlog";
import os from "os";
import { fetchLatestPackumentVersionUsing } from "../app/get-latest-version";
import { loadRegistryAuthUsing } from "../app/get-registry-auth";
import { queryAllRegistriesLazy } from "../app/query-registries";
import { resolveDependenciesUsing } from "../app/resolve-dependencies";
import { PackumentNotFoundError } from "../domain/common-errors";
import { DebugLog } from "../domain/logging";
import {
  makePackageReference,
  splitPackageReference,
} from "../domain/package-reference";
import { PackageUrl } from "../domain/package-url";
import { unityRegistry } from "../domain/registry";
import { SemanticVersion } from "../domain/semantic-version";
import { getHomePathFromEnv } from "../domain/special-paths";
import { getUserUpmConfigPathFor } from "../domain/upm-config";
import { isZod } from "../domain/zod-utils";
import type { ReadTextFile } from "../io/fs";
import type { GetRegistryPackument } from "../io/registry";
import type { CheckUrlExists } from "../io/www";
import { stringifyDependencyGraph } from "./dependency-logging";
import { withErrorLogger } from "./error-logging";
import { primaryRegistryUrlOpt } from "./opt-registry";
import { systemUserOpt } from "./opt-system-user";
import { GlobalOptions } from "./options";
import { parseEnvUsing } from "./parse-env";
import { ResultCodes } from "./result-codes";
import { mustBePackageReference } from "./validators";

const pkgArg = new Argument("<pkg>", "Reference to a package").argParser(
  mustBePackageReference
);

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
  return new Command("deps")
    .alias("dep")
    .addArgument(pkgArg)
    .addOption(deepOpt)
    .addOption(primaryRegistryUrlOpt)
    .addOption(systemUserOpt)
    .description(
      `view package dependencies
openupm deps <pkg>
openupm deps <pkg>@<version>`
    )
    .action(
      withErrorLogger(log, async function (pkg, depsOptions, cmd) {
        const globalOptions = cmd.optsWithGlobals<GlobalOptions>();

        // parse env
        await parseEnvUsing(log, process.env, globalOptions);

        const homePath = getHomePathFromEnv(process.env);
        const upmConfigPath = getUserUpmConfigPathFor(
          process.env,
          homePath,
          depsOptions.systemUser
        );
        const primaryRegistry = await loadRegistryAuthUsing(
          readTextFile,
          debugLog,
          upmConfigPath,
          depsOptions.registry
        );
        const sources = [primaryRegistry, unityRegistry];

        const [packageName, requestedVersion] = splitPackageReference(pkg);

        if (
          requestedVersion !== undefined &&
          isZod(requestedVersion, PackageUrl)
        ) {
          log.error("", "cannot get dependencies for url-version");
          return process.exit(ResultCodes.Error);
        }

        const latestVersion =
          requestedVersion !== undefined &&
          isZod(requestedVersion, SemanticVersion)
            ? requestedVersion
            : (
                await queryAllRegistriesLazy(sources, (source) =>
                  fetchLatestPackumentVersionUsing(
                    fetchPackument,
                    source,
                    packageName
                  )
                )
              )?.value ?? null;

        if (latestVersion === null)
          throw new PackumentNotFoundError(packageName);

        await debugLog(
          `fetch: ${makePackageReference(packageName, latestVersion)}, deep=${
            depsOptions.deep
          }`
        );
        const dependencyGraph = await resolveDependenciesUsing(
          checkUrlExists,
          fetchPackument,
          sources,
          packageName,
          latestVersion,
          depsOptions.deep
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
