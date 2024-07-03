import { Registry } from "../domain/registry";
import { AsyncResult, Result } from "ts-results-es";
import { SearchedPackument, SearchRegistry } from "../io/npm-search";
import { FetchAllPackuments } from "../io/all-packuments-io";
import {
  GenericNetworkError,
  RegistryAuthenticationError,
} from "../io/common-errors";

/**
 * Error which may occur when searching for packages.
 */
export type SearchPackagesError =
  | RegistryAuthenticationError
  | GenericNetworkError;

/**
 * A function for searching packages in a registry.
 * @param registry The registry to search.
 * @param keyword A keyword by which to search packages. Usually the name.
 * @param onUseAllFallback Callback that is used to notify clients when the
 * search api is not available and the /-/all endpoint is used instead.
 */
export type SearchPackages = (
  registry: Registry,
  keyword: string,
  onUseAllFallback?: () => void
) => AsyncResult<ReadonlyArray<SearchedPackument>, SearchPackagesError>;

/**
 * Makes a {@licence SearchPackages} function.
 */
export function makeSearchPackages(
  searchRegistry: SearchRegistry,
  fetchAllPackuments: FetchAllPackuments
): SearchPackages {
  async function searchInAll(
    registry: Registry,
    keyword: string
  ): Promise<SearchedPackument[]> {
    const allPackuments = await fetchAllPackuments(registry);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _updated, ...packumentEntries } = allPackuments;
    const packuments = Object.values(packumentEntries);
    const klc = keyword.toLowerCase();
    return packuments.filter((packument) =>
      packument.name.toLowerCase().includes(klc)
    );
  }

  return (registry, keyword, onUseOldSearch) => {
    // search endpoint
    return searchRegistry(registry, keyword).orElse(() => {
      // search old search
      onUseOldSearch && onUseOldSearch();
      return Result.wrapAsync(() => searchInAll(registry, keyword));
    });
  };
}
