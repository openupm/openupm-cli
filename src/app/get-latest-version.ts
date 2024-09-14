import { DomainName } from "../domain/domain-name";
import { tryResolvePackumentVersion } from "../domain/packument";
import { Registry } from "../domain/registry";
import { SemanticVersion } from "../domain/semantic-version";
import type { GetRegistryPackument } from "../io/registry";

/**
 * Gets the latest published version of a package from a npm registry.
 * @param getRegistryPackument IO function for getting a remote packument.
 * @param source The source to check for the package.
 * @param packageName The name of the package to search.
 * @returns The resolved version or null if the package does not exist on the
 * registry.
 */
export async function fetchLatestPackumentVersionUsing(
  getRegistryPackument: GetRegistryPackument,
  source: Registry,
  packageName: DomainName
): Promise<SemanticVersion | null> {
  const packument = await getRegistryPackument(source, packageName);
  if (packument === null) return null;

  return tryResolvePackumentVersion(packument, "latest").unwrap().version;
}
