import { Argument, Command, Option } from "@commander-js/extra-typings";
import { Logger } from "npmlog";
import { addDependenciesUsing } from "../app/add-dependencies.js";
import { determineEditorVersionUsing } from "../app/determine-editor-version.js";
import { loadRegistryAuthUsing } from "../app/get-registry-auth.js";
import { partialApply } from "../domain/fp-utils.js";
import { DebugLog } from "../domain/logging.js";
import { makePackageSpec } from "../domain/package-spec.js";
import { recordEntries } from "../domain/record-utils.js";
import { unityRegistry } from "../domain/registry.js";
import { openupmRegistryUrl } from "../domain/registry-url.js";
import { getHomePathFromEnv } from "../domain/special-paths.js";
import { getUserUpmConfigPathFor } from "../domain/upm-config.js";
import type { ReadTextFile, WriteTextFile } from "../io/fs.js";
import type { GetRegistryPackument } from "../io/registry.js";
import type { CheckUrlExists } from "../io/www.js";
import { eachValue } from "./cli-parsing.js";
import { withErrorLogger } from "./error-logging.js";
import { primaryRegistriesUrlOpt } from "./opt-registry.js";
import { systemUserOpt } from "./opt-system-user.js";
import { upstreamOpt } from "./opt-upstream.js";
import { workDirOpt } from "./opt-wd.js";
import { mustBePackageSpec } from "./validators.js";

const packageSpecsArg = new Argument(
  "<package-spec...>",
  "Specs of packages that should be added"
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
    .aliases([
      "ad",
      "i",
      "in",
      "ins",
      "inst",
      "insta",
      "instal",
      "isnt",
      "isnta",
      "isntal",
      "isntall",
      "install",
    ])
    .addArgument(packageSpecsArg)
    .addOption(addTestableOpt)
    .addOption(forceOpt)
    .addOption(primaryRegistriesUrlOpt)
    .addOption(workDirOpt)
    .addOption(systemUserOpt)
    .addOption(upstreamOpt)
    .summary("add a dependency to the project")
    .description(
      `Add a dependency to the project as well as all indirect dependencies.
openupm add com.some.package@latest
openupm add com.some.package@1.2.3`
    )
    .action(
      withErrorLogger(log, async function (packageSpecs, options) {
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
      })
    );
}
