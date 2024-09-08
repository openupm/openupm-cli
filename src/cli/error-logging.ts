import { EOL } from "node:os";
import { Logger } from "npmlog";
import {
  CompatibilityCheckFailedError,
  PackageIncompatibleError,
  UnresolvedDependenciesError,
  type UnresolvedDependency,
} from "../app/add-dependencies";
import { EditorNotInstalledError } from "../app/builtin-packages";
import {
  ProjectVersionMalformedError,
  ProjectVersionMissingError,
} from "../app/determine-editor-version";
import {
  ManifestMalformedError,
  ManifestMissingError,
} from "../app/get-dependencies";
import {
  EditorVersionNotSupportedError,
  PackumentNotFoundError,
} from "../domain/common-errors";
import { stringifyEditorVersion } from "../domain/editor-version";
import {
  NoVersionsError,
  VersionNotFoundError,
  type ResolvePackumentVersionError,
} from "../domain/packument";
import { recordEntries } from "../domain/record-utils";
import { NoSystemUserProfilePath } from "../domain/upm-config";
import { RegistryAuthenticationError } from "../io/common-errors";
import {
  NoHomePathError,
  OSNotSupportedError,
  VersionNotSupportedOnOsError,
} from "../domain/special-paths";
import { RegistryAuthLoadError } from "./parse-env";
import { ResultCodes } from "./result-codes";

function errorMessageFor(error: ResolvePackumentVersionError): string {
  if (error instanceof PackumentNotFoundError) return "package not found";
  else return "version not found";
}

function stringifyUnresolvedDependency(
  dependency: UnresolvedDependency
): string {
  return (
    `${dependency.name}@${dependency.version}${EOL}` +
    recordEntries(dependency.errors).map(
      ([errorSource, error]) =>
        `  - "${errorSource}": ${errorMessageFor(error)}`
    )
  );
}

function makeErrorMessageFor(error: unknown): string {
  if (error instanceof RegistryAuthLoadError)
    return "Could not load registry authentication information.";
  if (error instanceof PackumentNotFoundError)
    return `Package "${error.packageName}" could not be found.`;
  if (error instanceof EditorVersionNotSupportedError)
    return `OpenUPM is not compatible with Unity ${stringifyEditorVersion(
      error.version
    )}.`;
  if (error instanceof CompatibilityCheckFailedError)
    return `Could not confirm editor compatibility for ${error.packageRef}.`;
  if (error instanceof PackageIncompatibleError)
    return `"${
      error.packageRef
    }" is not compatible with Unity ${stringifyEditorVersion(
      error.editorVersion
    )}.`;
  if (error instanceof UnresolvedDependenciesError)
    return (
      `"${error.packageRef}" has one or more unresolved dependencies and was not added.${EOL}` +
      `${error.dependencies.map(stringifyUnresolvedDependency).join(EOL)}`
    );
  if (error instanceof NoVersionsError)
    return `"${error.packageName}" can not be added because it has no published versions.`;
  if (error instanceof VersionNotFoundError)
    return `Can not add "${error.packageName}" because version ${error.requestedVersion} could not be found in any registry.`;
  if (error instanceof EditorNotInstalledError)
    return "Your projects Unity editor version is not installed.";
  if (error instanceof RegistryAuthenticationError)
    return `The registry at "${error.registryUrl}" refused your request because you are not authenticated.`;
  if (error instanceof VersionNotSupportedOnOsError)
    return "Your projects Unity editor version is not supported on your OS.";
  if (error instanceof OSNotSupportedError)
    return "Unity does not support your OS.";
  if (error instanceof ManifestMissingError)
    return `Project manifest could not be found at "${error.expectedPath}".`;
  if (error instanceof ManifestMalformedError)
    return "Project manifest could not be parsed because it has malformed content.";
  if (error instanceof ProjectVersionMissingError)
    return `Project version could not be found at "${error.expectedPath}".`;
  if (error instanceof ProjectVersionMalformedError)
    return "Project version could not be parsed because it has malformed content.";
  if (error instanceof NoHomePathError)
    return "Could not determine path of home directory.";
  if (error instanceof NoSystemUserProfilePath)
    return "Could not determine path of system user directory.";
  return "A fatal error occurred.";
}

function tryMakeFixSuggestionFor(error: unknown): string | null {
  if (error instanceof RegistryAuthLoadError)
    return "Most likely this means that something is wrong with your .upmconfig.toml.";
  if (error instanceof PackumentNotFoundError)
    return "Did you make a typo when spelling the name?";
  if (error instanceof CompatibilityCheckFailedError)
    return `Fix the issue or run with --force to add anyway.`;
  if (error instanceof PackageIncompatibleError)
    return "Add a different version or run with --force to add anyway.";
  if (error instanceof UnresolvedDependenciesError)
    return "Resolve the dependency issues or run with --force to add anyway.";
  if (error instanceof VersionNotFoundError)
    return `Make sure you chose the right version. Here is a list of your options:${EOL}${error.availableVersions.join(
      ", "
    )}`;
  if (error instanceof EditorNotInstalledError)
    return `Make sure you have ${stringifyEditorVersion(
      error.version
    )} installed.`;
  if (error instanceof RegistryAuthenticationError)
    return `Use "openupm login" to authenticate with the registry.`;
  if (
    error instanceof ManifestMissingError ||
    error instanceof ProjectVersionMissingError
  )
    return "Check if you are in the correct working directory.";
  if (
    error instanceof ManifestMalformedError ||
    error instanceof ProjectVersionMalformedError
  )
    return "Please fix any format errors and try again.";
  if (error instanceof NoHomePathError)
    return "Make sure you run OpenUPM with either the HOME or USERPROFILE environment variable set to your home path.";
  if (error instanceof NoSystemUserProfilePath)
    return "Make sure you run OpenUPM with the ALLUSERSPROFILE environment variable set to your home path.";
  return null;
}

/**
 * Prints information about an error to a logger.
 * @param log The logger to print to.
 * @param error The error.
 */
export function logError(log: Logger, error: unknown) {
  const message = makeErrorMessageFor(error);
  log.error("", message);

  const fixSuggestion = tryMakeFixSuggestionFor(error);
  if (fixSuggestion !== null) log.notice("", fixSuggestion);

  const isLoggingVerbose = log.level === "verbose" || log.level === "silly";
  if (!isLoggingVerbose)
    log.notice("", "Run with --verbose to get more information.");
}

/**
 * Wraps a function with an error logger. Any errors thrown by the function
 * will be caught and logged. Afterward the process will exit with
 * {@link ResultCodes.Error}.
 * @param log The logger to print to.
 * @param cmd The function to wrap.
 * @returns A new function that has the same behaviour as the original but with
 * error logging.
 */
export function withErrorLogger<
  TArgs extends unknown[],
  TOut extends ResultCodes
>(
  log: Logger,
  cmd: (...args: TArgs) => Promise<TOut>
): (...args: TArgs) => Promise<TOut> {
  return (...args) =>
    cmd(...args).catch((error) => {
      logError(log, error);
      process.exit(ResultCodes.Error);
    });
}
