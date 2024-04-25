import {
  ManifestLoadError,
  ManifestWriteError,
} from "../io/project-manifest-io";
import { NotFoundError } from "../io/file-io";
import { Logger } from "npmlog";

/**
 * Logs a {@link ManifestLoadError} to the console.
 */
export function logManifestLoadError(log: Logger, error: ManifestLoadError) {
  const prefix = "manifest";
  if (error instanceof NotFoundError)
    log.error(prefix, `manifest at ${error.path} does not exist`);
  else {
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
