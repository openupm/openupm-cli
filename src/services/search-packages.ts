import { Registry } from "../domain/registry";
import { SearchedPackument, SearchRegistry } from "../io/npm-search";
import { FetchAllPackuments } from "../io/all-packuments-io";
import { DebugLog } from "../logging";
import { assertIsError } from "../utils/error-type-guards";

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
) => Promise<ReadonlyArray<SearchedPackument>>;

/**
 * Makes a {@licence SearchPackages} function.
 */
export function makeSearchPackages(
  searchRegistry: SearchRegistry,
  fetchAllPackuments: FetchAllPackuments,
  debugLog: DebugLog
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

  return async (registry, keyword, onUseOldSearch) => {
    try {
      // search endpoint
      return await searchRegistry(registry, keyword);
    } catch (error) {
      assertIsError(error);
      debugLog("Searching using search endpoint failed", error);
      // search old search
      onUseOldSearch && onUseOldSearch();
      return await searchInAll(registry, keyword);
    }
  };
}
