import { DebugLog } from "../logging";
import { AsyncResult, Result } from "ts-results-es";
import fs from "fs/promises";
import { assertIsNodeError } from "../utils/error-type-guards";

function resultifyFsOp<T>(
  debugLog: DebugLog,
  op: () => Promise<T>
): AsyncResult<T, NodeJS.ErrnoException> {
  return new AsyncResult(Result.wrapAsync(op)).mapErr((error) => {
    assertIsNodeError(error);
    debugLog("fs-operation failed.", error);
    return error;
  });
}

/**
 * Attempts to get the names of all directories in a directory.
 * @param directoryPath The directories name.
 * @param debugLog Debug-log function.
 * TODO: Convert to service function.
 */
export function tryGetDirectoriesIn(
  directoryPath: string,
  debugLog: DebugLog
): AsyncResult<ReadonlyArray<string>, NodeJS.ErrnoException> {
  return resultifyFsOp(debugLog, () =>
    fs.readdir(directoryPath, { withFileTypes: true })
  )
    .map((entries) => entries.filter((it) => it.isDirectory()))
    .map((directories) => directories.map((it) => it.name));
}
