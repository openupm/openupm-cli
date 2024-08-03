import {RegistryUrl} from "../domain/registry-url";
import {addAuth} from "../domain/upm-config";
import {LoadUpmConfig, SaveUpmConfig} from "../io/upm-config-io";
import {NpmAuth} from "another-npm-registry-client";

/**
 * Function for storing authentication information in an upmconfig file.
 * @param configPath Path to the upmconfig file.
 * @param registry Url of the registry for which to authenticate.
 * @param auth Authentication information.
 */
export type SaveAuthToUpmConfig = (
  configPath: string,
  registry: RegistryUrl,
  auth: NpmAuth
) => Promise<void>;
/**
 * Makes a {@link SaveAuthToUpmConfig} function.
 */
export function makeSaveAuthToUpmConfig(
  loadUpmConfig: LoadUpmConfig,
  saveUpmConfig: SaveUpmConfig
): SaveAuthToUpmConfig {
  return async (configPath, registry, auth) => {
    const initialConfig = (await loadUpmConfig(configPath)) || {};
    const updatedConfig = addAuth(initialConfig, registry, auth);
    await saveUpmConfig(updatedConfig, configPath);
  };
}
