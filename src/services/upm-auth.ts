import { WriteTextFile } from "../io/fs-result";
import { RegistryUrl } from "../domain/registry-url";
import { addAuth, UpmAuth } from "../domain/upm-config";
import { AsyncResult } from "ts-results-es";
import {
  LoadUpmConfig,
  trySaveUpmConfig,
  UpmConfigLoadError,
} from "../io/upm-config-io";
import { GenericIOError } from "../io/common-errors";

/**
 * Errors which may occur when storing an {@link UpmAuth} to the file-system.
 */
export type UpmAuthStoreError = UpmConfigLoadError | GenericIOError;

/**
 * Function for storing authentication information in an upmconfig file.
 * @param configPath Path to the upmconfig file.
 * @param registry Url of the registry for which to authenticate.
 * @param auth Authentication information.
 */
export type SaveAuthToUpmConfig = (
  configPath: string,
  registry: RegistryUrl,
  auth: UpmAuth
) => AsyncResult<void, UpmAuthStoreError>;

/**
 * Makes a {@link SaveAuthToUpmConfig} function.
 */
export function makeSaveAuthToUpmConfig(
  loadUpmConfig: LoadUpmConfig,
  writeFile: WriteTextFile
): SaveAuthToUpmConfig {
  // TODO: Add tests for this service
  return (configPath, registry, auth) =>
    loadUpmConfig(configPath)
      .map((maybeConfig) => maybeConfig || {})
      .map((config) => addAuth(registry, auth, config))
      .andThen((config) => trySaveUpmConfig(writeFile, config, configPath));
}
