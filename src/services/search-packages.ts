import { Registry } from "../domain/registry";
import { AsyncResult } from "ts-results-es";
import { SearchedPackument, SearchRegistry } from "../io/npm-search";
import { FetchAllPackuments } from "../io/all-packuments-io";
import { HttpErrorBase } from "npm-registry-fetch/lib/errors";

export type SearchPackagesError = HttpErrorBase;

export type SearchPackages = (
  registry: Registry,
  keyword: string,
  onUseAllFallback?: () => void
) => AsyncResult<ReadonlyArray<SearchedPackument>, SearchPackagesError>;

export function makePackagesSearcher(
  searchRegistry: SearchRegistry,
  fetchAllPackuments: FetchAllPackuments
): SearchPackages {
  function searchInAll(
    registry: Registry,
    keyword: string
  ): AsyncResult<SearchedPackument[], HttpErrorBase> {
    return fetchAllPackuments(registry).map((allPackuments) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _updated, ...packumentEntries } = allPackuments;
      const packuments = Object.values(packumentEntries);

      // filter keyword
      const klc = keyword.toLowerCase();

      return packuments.filter((packument) =>
        packument.name.toLowerCase().includes(klc)
      );
    });
  }

  return (registry, keyword, onUseOldSearch) => {
    // search endpoint
    return searchRegistry(registry, keyword).orElse(() => {
      // search old search
      onUseOldSearch && onUseOldSearch();
      return searchInAll(registry, keyword);
    });
  };
}
