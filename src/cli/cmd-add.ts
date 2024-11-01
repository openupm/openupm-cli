import { Argument, Command, Option } from "@commander-js/extra-typings";
import { Logger } from "npmlog";
import { addDependenciesUsing } from "../app/add-dependencies";
import { determineEditorVersionUsing } from "../app/determine-editor-version";
import { loadRegistryAuthUsing } from "../app/get-registry-auth";
import { partialApply } from "../domain/fp-utils";
import { DebugLog } from "../domain/logging";
import { makePackageSpec } from "../domain/package-spec";
import { recordEntries } from "../domain/record-utils";
import { unityRegistry } from "../domain/registry";
import { openupmRegistryUrl } from "../domain/registry-url";
import { getHomePathFromEnv } from "../domain/special-paths";
import { getUserUpmConfigPathFor } from "../domain/upm-config";
import type { ReadTextFile, WriteTextFile } from "../io/fs";
import type { GetRegistryPackument } from "../io/registry";
import type { CheckUrlExists } from "../io/www";
import { eachValue } from "./cli-parsing";
import { withErrorLogger } from "./error-logging";
import { primaryRegistriesUrlOpt } from "./opt-registry";
import { systemUserOpt } from "./opt-system-user";
import { upstreamOpt } from "./opt-upstream";
import { workDirOpt } from "./opt-wd";
import { mustBePackageSpec } from "./validators";

const packageSpecArg = new Argument(
  "<pkg>",
  "Reference to the package that should be added"
).argParser(mustBePackageSpec);

const otherPackageSpecsArg = new Argument(
  "[otherPkgs...]",
  "References to additional packages that should be added"
).argParser(eachValue(mustBePackageSpec));

const addTestableOpt = new Option(
  "-t, --test",
  "add package as testable"
).default(false);

const forceOpt = new Option(
  "-f, --force",
  "force add package if missing deps or editor version is not qualified"
).default(false);

/**
 * Makes the `openupm add` cli command with the given dependencies.
 * @param checkUrlExists IO function to check whether a url exists.
 * @param fetchPackument IO function for fetching a packument.
 * @param readTextFile IO function for reading a text file.
 * @param writeTextFile IO function for writing a text file.
 * @param log Logger for cli output.
 * @param debugLog IO function for debug-logs.
 * @returns The command.
 */
export function makeAddCmd(
  checkUrlExists: CheckUrlExists,
  fetchPackument: GetRegistryPackument,
  readTextFile: ReadTextFile,
  writeTextFile: WriteTextFile,
  log: Logger,
  debugLog: DebugLog
) {
  const determineEditorVersion = partialApply(
    determineEditorVersionUsing,
    readTextFile,
    debugLog
  );

  const getRegistryAuth = partialApply(
    loadRegistryAuthUsing,
    readTextFile,
    debugLog
  );

  const addDependencies = partialApply(
    addDependenciesUsing,
    readTextFile,
    writeTextFile,
    fetchPackument,
    checkUrlExists,
    debugLog
  );

  return new Command("add")
    .aliases(["install", "i"])
    .addArgument(packageSpecArg)
    .addArgument(otherPackageSpecsArg)
    .addOption(addTestableOpt)
    .addOption(forceOpt)
    .addOption(primaryRegistriesUrlOpt)
    .addOption(workDirOpt)
    .addOption(systemUserOpt)
    .addOption(upstreamOpt)
    .description(
      `add package to manifest json
openupm add <pkg> [otherPkgs...]
openupm add <pkg>@<version> [otherPkgs...]`
    )
    .action(
      withErrorLogger(
        log,
        async function (packageSpec, otherPackageSpecs, options) {
          const packageSpecs = [packageSpec].concat(otherPackageSpecs);

          const projectDirectory = options.chdir;

          const editorVersion = await determineEditorVersion(projectDirectory);

          if (typeof editorVersion === "string")
            log.warn(
              "editor.version",
              `${editorVersion} is unknown, the editor version check is disabled`
            );

          const homePath = getHomePathFromEnv(process.env);
          const upmConfigPath = getUserUpmConfigPathFor(
            process.env,
            homePath,
            options.systemUser
          );

          const sources = await Promise.all(
            (options.registry ?? [openupmRegistryUrl]).map((it) =>
              getRegistryAuth(upmConfigPath, it)
            )
          );

          if (options.upstream) sources.push(unityRegistry);

          const addResults = await addDependencies(
            projectDirectory,
            typeof editorVersion === "string" ? null : editorVersion,
            sources,
            options.force,
            options.test,
            packageSpecs
          );

          recordEntries(addResults)
            .map(([packageName, addResult]) => {
              switch (addResult.type) {
                case "added":
                  return `added ${makePackageSpec(
                    packageName,
                    addResult.version
                  )}`;
                case "upgraded":
                  return `modified ${packageName} ${addResult.fromVersion} => ${addResult.toVersion}`;
                case "noChange":
                  return `existed ${makePackageSpec(
                    packageName,
                    addResult.version
                  )}`;
              }
            })
            .forEach((message) => {
              log.notice("", message);
            });

          log.notice("", "please open Unity project to apply changes.");
        }
      )
    );
}
