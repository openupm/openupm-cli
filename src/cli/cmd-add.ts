import { Logger } from "npmlog";
import { addDependenciesUsing } from "../app/add-dependencies";
import { determineEditorVersionUsing } from "../app/determine-editor-version";
import { loadRegistryAuthUsing } from "../app/get-registry-auth";
import {
  makePackageReference,
  PackageReference,
} from "../domain/package-reference";
import { getUserUpmConfigPathFor } from "../domain/upm-config";
import type { CheckUrlExists } from "../io/check-url";
import type { GetRegistryPackument } from "../io/packument-io";
import { getHomePathFromEnv } from "../io/special-paths";
import type { ReadTextFile, WriteTextFile } from "../io/text-file-io";
import { DebugLog } from "../logging";
import { recordEntries } from "../utils/record-utils";
import { CmdOptions } from "./options";
import { parseEnvUsing } from "./parse-env";
import { ResultCodes } from "./result-codes";

/**
 * Options passed to the add command.
 */
export type AddOptions = CmdOptions<{
  /**
   * Whether to also add the packages to testables.
   */
  test?: boolean;
  /**
   * Whether to run with force. This will add packages even if validation
   * was not possible.
   */
  force?: boolean;
}>;

/**
 * The different command result codes for the add command.
 */
export type AddResultCode = ResultCodes.Ok | ResultCodes.Error;

/**
 * Cmd-handler for adding packages.
 * @param pkgs One or multiple references to packages to add.
 * @param options Options specifying how to add the packages.
 */
type AddCmd = (
  pkgs: PackageReference | PackageReference[],
  options: AddOptions
) => Promise<AddResultCode>;

/**
 * Makes a {@link AddCmd} function.
 */
export function makeAddCmd(
  checkUrlExists: CheckUrlExists,
  fetchPackument: GetRegistryPackument,
  readTextFile: ReadTextFile,
  writeTextFile: WriteTextFile,
  log: Logger,
  debugLog: DebugLog
): AddCmd {
  return async (pkgs, options) => {
    if (!Array.isArray(pkgs)) pkgs = [pkgs];

    // parse env
    const env = await parseEnvUsing(log, process.env, process.cwd(), options);

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
      options.force === true,
      options.test === true,
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
    return ResultCodes.Ok;
  };
}
