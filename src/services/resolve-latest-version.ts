import { DomainName } from "../domain/domain-name";
import { tryResolvePackumentVersion } from "../domain/packument";
import { Registry } from "../domain/registry";
import { SemanticVersion } from "../domain/semantic-version";
import { FetchPackument } from "../io/packument-io";

/**
 * Service for resolving the latest published version of a package.
 * @param source The source to check for the package.
 * @param packageName The name of the package to search.
 * @returns The resolved version or null if the package does not exist on the
 * registry.
 */
export type ResolveLatestVersion = (
  source: Registry,
  packageName: DomainName
) => Promise<SemanticVersion | null>;

/**
 * Makes a {@link ResolveLatestVersion} service function.
 */
export function makeResolveLatestVersion(
  fetchPackument: FetchPackument
): ResolveLatestVersion {
  return async (source, packageName) => {
    const packument = await fetchPackument(source, packageName);
    if (packument === null) return null;

    const resolveResult = tryResolvePackumentVersion(packument, "latest");
    if (resolveResult.isErr()) throw resolveResult.error;

    return resolveResult.value.version;
  };
}
