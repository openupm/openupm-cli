import log from "./logger";
import {
  ManifestLoadError,
  ManifestWriteError,
} from "../io/project-manifest-io";
import { IOError, NotFoundError } from "../io/file-io";

/**
 * Logs a {@link ManifestLoadError} to the console.
 * @param error The error to log.
 */
export function logManifestLoadError(error: ManifestLoadError) {
  const prefix = "manifest";

  if (error.cause instanceof NotFoundError)
    log.error(
      prefix,
      `there is no project manifest at ${error.path}. Are you in the correct working directory?`
    );
  else if (error.cause instanceof IOError)
    log.error(
      prefix,
      `failed to load project manifest at ${
        error.path
      } due to a file-system error.
    The exact error is ${
      error.cause.cause !== undefined
        ? `"${error.cause.cause.message}"`
        : "unknown"
    }`
    );
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
  log.error(prefix, "can not write manifest json file");
  log.error(prefix, error.message);
}
