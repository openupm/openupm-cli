import { RegistryUrl } from "./registry-url";
import { NpmAuth } from "another-npm-registry-client";

/**
 * Abstraction of an upmconfig.toml file.
 */
export type UpmConfig = Readonly<Record<RegistryUrl, NpmAuth>>;

export const emptyUpmConfig: UpmConfig = {};

/**
 * Attempts to get the {@link NpmAuth} information for a specific registry
 * from a {@link UpmConfig} object.
 * @param upmConfig The config.
 * @param registry The registry.
 * @returns The auth information or null if the registry does not exist
 * in the config.
 */
export function tryGetAuthForRegistry(
  upmConfig: UpmConfig,
  registry: RegistryUrl
): NpmAuth | null {
  return upmConfig[registry] ?? null;
}

/**
 * Adds an entry to an upm-config.
 * @param upmConfig The config.
 * @param registry The registry for which to authenticate.
 * @param auth The autentication information.
 * @returns A new config with the entry added.
 */
export function addAuth(
  upmConfig: UpmConfig,
  registry: RegistryUrl,
  auth: NpmAuth
): UpmConfig {
  return { ...upmConfig, [registry]: auth };
}
