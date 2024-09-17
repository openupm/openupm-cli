import { Argument, Command } from "@commander-js/extra-typings";
import { Logger } from "npmlog";
import { addDependenciesUsing } from "../app/add-dependencies";
import { determineEditorVersionUsing } from "../app/determine-editor-version";
import { loadRegistryAuthUsing } from "../app/get-registry-auth";
import { DebugLog } from "../domain/logging";
import { makePackageReference } from "../domain/package-reference";
import { recordEntries } from "../domain/record-utils";
import { getHomePathFromEnv } from "../domain/special-paths";
import { getUserUpmConfigPathFor } from "../domain/upm-config";
import type { ReadTextFile, WriteTextFile } from "../io/fs";
import type { GetRegistryPackument } from "../io/registry";
import type { CheckUrlExists } from "../io/www";
import { eachValue } from "./cli-parsing";
import { withErrorLogger } from "./error-logging";
import type { GlobalOptions } from "./options";
import { parseEnvUsing } from "./parse-env";
import { mustBePackageReference } from "./validators";

const pkgArg = new Argument(
  "<pkg>",
  "Reference to the package that should be added"
).argParser(mustBePackageReference);

const otherPkgsArg = new Argument(
  "[otherPkgs...]",
  "References to additional packages that should be added"
).argParser(eachValue(mustBePackageReference));

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
  return new Command("add")
    .addArgument(pkgArg)
    .addArgument(otherPkgsArg)
    .aliases(["install", "i"])
    .option("-t, --test", "add package as testable")
    .option(
      "-f, --force",
      "force add package if missing deps or editor version is not qualified"
    )
    .description(
      `add package to manifest json
openupm add <pkg> [otherPkgs...]
openupm add <pkg>@<version> [otherPkgs...]`
    )
    .action(
      withErrorLogger(log, async function (pkg, otherPkgs, addOptions, cmd) {
        const globalOptions = cmd.optsWithGlobals<GlobalOptions>();

        const pkgs = [pkg].concat(otherPkgs);

        // parse env
        const env = await parseEnvUsing(
          log,
          process.env,
          process.cwd(),
          globalOptions
        );

        const editorVersion = await determineEditorVersionUsing(
          readTextFile,
          debugLog,
          env.cwd
        );

        if (typeof editorVersion === "string")
          log.warn(
            "editor.version",
            `${editorVersion} is unknown, the editor version check is disabled`
          );

        const projectDirectory = env.cwd;

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

        const addResults = await addDependenciesUsing(
          readTextFile,
          writeTextFile,
          fetchPackument,
          checkUrlExists,
          debugLog,
          projectDirectory,
          typeof editorVersion === "string" ? null : editorVersion,
          primaryRegistry,
          env.upstream,
          addOptions.force === true,
          addOptions.test === true,
          pkgs
        );

        recordEntries(addResults)
          .map(([packageName, addResult]) => {
            switch (addResult.type) {
              case "added":
                return `added ${makePackageReference(
                  packageName,
                  addResult.version
                )}`;
              case "upgraded":
                return `modified ${packageName} ${addResult.fromVersion} => ${addResult.toVersion}`;
              case "noChange":
                return `existed ${makePackageReference(
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
