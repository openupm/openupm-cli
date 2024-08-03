import { RegistryUrl } from "./registry-url";
import { NpmAuth } from "another-npm-registry-client";

/**
 * Abstraction of an upmconfig.toml file.
 */
export type UPMConfig = Readonly<Record<RegistryUrl, NpmAuth>>;

export const emptyUpmConfig: UPMConfig = {}

/**
 * Attempts to get the {@link NpmAuth} information for a specific registry
 * from a {@link UPMConfig} object.
 * @param upmConfig The config.
 * @param registry The registry.
 * @returns The auth information or null if the registry does not exist
 * in the config.
 */
export function tryGetAuthForRegistry(
  upmConfig: UPMConfig,
  registry: RegistryUrl
): NpmAuth | null {
  return upmConfig[registry] ?? null;
}

export function addAuth(
  upmConfig: UPMConfig,
  registry: RegistryUrl,
  auth: NpmAuth
): UPMConfig {
  return { ...upmConfig, [registry]: auth };
}
