import log from "./logger";
import {
  ManifestLoadError,
  ManifestSaveError,
} from "./utils/project-manifest-io";
import { RequiredFileNotFoundError } from "./common-errors";

/**
 * Logs a {@link ManifestLoadError} to the console.
 * @param error The error to log.
 */
export function logManifestLoadError(error: ManifestLoadError) {
  const prefix = "manifest";
  if (error instanceof RequiredFileNotFoundError)
    log.error(prefix, `manifest at ${error.path} does not exist`);
  else {
    log.error(prefix, `failed to parse manifest at ${error.path}`);
    log.error(prefix, error.cause.message);
  }
}

/**
 * Logs a {@link ManifestSaveError} to the console.
 * @param error The error to log.
 */
export function logManifestSaveError(error: ManifestSaveError) {
  const prefix = "manifest";
  log.error(prefix, "can not write manifest json file");
  log.error(prefix, error.message);
}
