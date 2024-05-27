import {
  ManifestLoadError,
  ManifestWriteError,
} from "../io/project-manifest-io";
import { Logger } from "npmlog";
import { PackumentVersionResolveError } from "../packument-version-resolving";
import { FileParseError, PackumentNotFoundError } from "../common-errors";
import { DomainName } from "../domain/domain-name";
import { VersionNotFoundError } from "../domain/packument";
import { EnvParseError } from "../services/parse-env";
import { NoWslError } from "../io/wsl";
import { ChildProcessError } from "../utils/process";
import { RequiredEnvMissingError } from "../io/upm-config-io";
import { FileMissingError, GenericIOError } from "../io/common-errors";

/**
 * Logs a {@link ManifestLoadError} to the console.
 */
export function logManifestLoadError(log: Logger, error: ManifestLoadError) {
  const prefix = "manifest";
  if (error instanceof FileMissingError)
    log.error(prefix, `manifest at ${error.path} does not exist`);
  else if (error instanceof FileParseError) {
    log.error(prefix, `failed to parse manifest at ${error.path}`);
    if (error.cause !== undefined) log.error(prefix, error.cause.message);
  }
}

/**
 * Logs a {@link ManifestWriteError} to the console.
 */
export function logManifestSaveError(log: Logger, error: ManifestWriteError) {
  const prefix = "manifest";
  log.error(prefix, "can not write manifest json file");
  log.error(prefix, error.message);
}

/**
 * Logs a {@link PackumentVersionResolveError} to the console.
 */
export function logPackumentResolveError(
  log: Logger,
  packageName: DomainName,
  error: PackumentVersionResolveError
) {
  if (error instanceof PackumentNotFoundError)
    log.error("404", `package not found: ${packageName}`);
  else if (error instanceof VersionNotFoundError) {
    const versionList = [...error.availableVersions].reverse().join(", ");
    log.warn(
      "404",
      `version ${error.requestedVersion} is not a valid choice of: ${versionList}`
    );
  }
}

/**
 * Logs a {@link EnvParseError} to a logger.
 */
export function logEnvParseError(log: Logger, error: EnvParseError) {
  // TODO: Formulate more specific error messages.
  const reason =
    error instanceof NoWslError
      ? "you attempted to use wsl even though you are not running openupm inside wsl"
      : error instanceof FileMissingError
      ? `the projects version file (ProjectVersion.txt) could not be found at "${error.path}"`
      : error instanceof GenericIOError
      ? `a file-system interaction failed`
      : error instanceof ChildProcessError
      ? "a required child process failed"
      : error instanceof FileParseError
      ? `the file at ${error.path} could not parsed into a ${error.targetDescription}`
      : error instanceof RequiredEnvMissingError
      ? `none of the following environment variables were set: ${error.keyNames.join(
          ", "
        )}`
      : `a string was malformed. Expected to be ${error.formatName}`;
  const errorMessage = `environment information could not be parsed because ${reason}.`;
  log.error("", errorMessage);

  // TODO: Suggest actions user might take in order to fix the problem.
}
