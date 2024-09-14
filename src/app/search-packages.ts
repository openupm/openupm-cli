import { assertIsError } from "../domain/error-type-guards";
import { DebugLog } from "../domain/logging";
import { Registry } from "../domain/registry";
import {
  GetAllRegistryPackuments,
  type SearchRegistry,
} from "../io/registry";
import { type SearchedPackument } from "../domain/packument";

/**
 * A function for searching packages in a registry.
 * @param searchRegistry IO function for searching a remote registry.
 * @param getAllRegistryPackuments IO function for getting all packages from
 * a remote registry.
 * @param debugLog IO function for logging debug messages.
 * @param registry The registry to search.
 * @param keyword A keyword by which to search packages. Usually the name.
 * @param onUseAllFallback Callback that is used to notify clients when the
 * search api is not available and the /-/all endpoint is used instead.
 */
export async function searchPackagesUsing(
  searchRegistry: SearchRegistry,
  getAllRegistryPackuments: GetAllRegistryPackuments,
  debugLog: DebugLog,
  registry: Registry,
  keyword: string,
  onUseAllFallback?: () => void
): Promise<ReadonlyArray<SearchedPackument>> {
  try {
    // search endpoint
    return await searchRegistry(registry, keyword);
  } catch (error) {
    assertIsError(error);
    await debugLog("Searching using search endpoint failed", error);
    // search old search
    onUseAllFallback && onUseAllFallback();
    const allPackuments = await getAllRegistryPackuments(registry);
    const klc = keyword.toLowerCase();
    return allPackuments.filter((packument) =>
      packument.name.toLowerCase().includes(klc)
    );
  }
}
