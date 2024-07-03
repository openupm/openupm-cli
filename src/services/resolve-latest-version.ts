import { Registry } from "../domain/registry";
import { DomainName } from "../domain/domain-name";
import { SemanticVersion } from "../domain/semantic-version";
import { tryResolvePackumentVersion } from "../domain/packument";
import { FetchPackument } from "../io/packument-io";
import { FromRegistry, queryAllRegistriesLazy } from "../utils/sources";
import { resultifyAsyncOp } from "../utils/result-utils";

/**
 * Service for resolving the latest published version of a package.
 * @param sources All sources to check for the package.
 * @param packageName The name of the package to search.
 * @returns The resolved version or null if the package does not exist on the
 * registry.
 */
export type ResolveLatestVersion = (
  sources: ReadonlyArray<Registry>,
  packageName: DomainName
) => Promise<FromRegistry<SemanticVersion> | null>;

export function makeResolveLatestVersion(
  fetchPackument: FetchPackument
): ResolveLatestVersion {
  async function tryResolveFrom(
    source: Registry,
    packageName: DomainName
  ): Promise<SemanticVersion | null> {
    const packument = await fetchPackument(source, packageName);
    if (packument === null) return null;
    return tryResolvePackumentVersion(packument, "latest").unwrap().version;
  }

  return async (sources, packageName) => {
    return (
      await queryAllRegistriesLazy(sources, (source) =>
        resultifyAsyncOp(tryResolveFrom(source, packageName))
      ).promise
    ).unwrap();
  };
}
