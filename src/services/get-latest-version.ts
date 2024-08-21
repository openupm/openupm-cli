import RegClient from "another-npm-registry-client";
import { DomainName } from "../domain/domain-name";
import { tryResolvePackumentVersion } from "../domain/packument";
import { Registry } from "../domain/registry";
import { SemanticVersion } from "../domain/semantic-version";
import { getRegistryPackument, GetRegistryPackument } from "../io/packument-io";

/**
 * Gets the latest published version of a package from a npm registry.
 * @param source The source to check for the package.
 * @param packageName The name of the package to search.
 * @returns The resolved version or null if the package does not exist on the
 * registry.
 */
export type GetLatestVersion = (
  source: Registry,
  packageName: DomainName
) => Promise<SemanticVersion | null>;

/**
 * Makes a {@link GetLatestVersion} service function which gets
 * the version from a remote npm registry.
 */
export function GetLatestVersionFromRegistryPackument(
  getRegistryPackument: GetRegistryPackument
): GetLatestVersion {
  return async (source, packageName) => {
    const packument = await getRegistryPackument(source, packageName);
    if (packument === null) return null;

    return tryResolvePackumentVersion(packument, "latest").unwrap().version;
  };
}

/**
 * Default {@link GetLatestVersion}. Uses {@link GetLatestVersionFromRegistryPackument}.
 */
export const getLatestVersion = (registryClient: RegClient.Instance) =>
  GetLatestVersionFromRegistryPackument(getRegistryPackument(registryClient));
