import { IOError, WriteTextFile } from "../io/file-io";
import { RegistryUrl } from "../domain/registry-url";
import { addAuth, UpmAuth } from "../domain/upm-config";
import { AsyncResult } from "ts-results-es";
import {
  LoadUpmConfig,
  trySaveUpmConfig,
  UpmConfigLoadError,
} from "../io/upm-config-io";

/**
 * Errors which may occur when storing an {@link UpmAuth} to the file-system.
 */
export type UpmAuthStoreError = UpmConfigLoadError | IOError;

/**
 * Service function for storing authentication information in an upmconfig file.
 * @param configDir Path to the directory in which the upmconfig file is
 * located.
 * @param registry Url of the registry for which to authenticate.
 * @param auth Authentication information.
 * @returns The path of the upmconfig file.
 */
export type SaveAuthToUpmConfig = (
  configDir: string,
  registry: RegistryUrl,
  auth: UpmAuth
) => AsyncResult<string, UpmAuthStoreError>;

/**
 * Makes a {@link SaveAuthToUpmConfig} function.
 */
export function makeSaveAuthToUpmConfigService(
  loadUpmConfig: LoadUpmConfig,
  writeFile: WriteTextFile
): SaveAuthToUpmConfig {
  // TODO: Add tests for this service
  return (configDir, registry, auth) =>
    loadUpmConfig(configDir)
      .map((maybeConfig) => maybeConfig || {})
      .map((config) => addAuth(registry, auth, config))
      .andThen((config) => trySaveUpmConfig(writeFile, config, configDir));
}
