import log from "./logger";
import {
  ManifestLoadError,
  ManifestWriteError,
} from "../io/project-manifest-io";
import { IOError, NotFoundError } from "../io/file-io";

const verboseLevels = ["silly", "verbose"];

function isVerbose(logger: log.Logger) {
  return verboseLevels.includes(logger.level);
}

/**
 * Logs an IO error.
 * @param error The error to log.
 * @param prefixOverride The logging prefix. If omitted, a default will be used.
 */
function logIOError(error: IOError, prefixOverride?: string) {
  const prefix = prefixOverride ?? "io";
  log.error(prefix, "A file-system interaction failed.");

  if (!isVerbose(log)) {
    log.info(prefix, `Run with --verbose to see more.`);
    return;
  }
  const cause =
    error.cause === undefined ? `unknown` : `"${error.cause.message}"`;
  const message = `The exact issue is ${cause}.`;
  log.verbose(prefix, message);
}

/**
 * Logs a {@link ManifestLoadError} to the console.
 * @param error The error to log.
 */
export function logManifestLoadError(error: ManifestLoadError) {
  const prefix = "manifest";
  log.error(prefix, "The project manifest could not be loaded.");

  if (error.cause instanceof NotFoundError)
    log.error(
      prefix,
      `there is no project manifest at ${error.path}. Are you in the correct working directory?`
    );
  else if (error.cause instanceof IOError) logIOError(error.cause, "manifest");
  else
    log.error(
      prefix,
      `your project manifests content does not seem to be valid json.
      The exact error is "${error.cause.cause.message}".`
    );
}

/**
 * Logs a {@link ManifestWriteError} to the console.
 * @param error The error to log.
 */
export function logManifestSaveError(error: ManifestWriteError) {
  const prefix = "manifest";
  log.error(prefix, "The project manifest could not be written.");
  logIOError(error, prefix);
}
