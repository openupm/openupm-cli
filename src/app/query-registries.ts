import { Registry } from "../domain/registry.js";
import { RegistryUrl } from "../domain/registry-url.js";

/**
 * A value that was resolved from a remote registry.
 */
export type FromRegistry<T> = {
  /**
   * The resolved value.
   */
  value: T;
  /**
   * The source from which the value was resolved.
   */
  source: RegistryUrl;
};

/**
 * Queries a series of registries using a query function. If the query
 * returns null, the next source will be checked.
 * @param sources The sources to check in order.
 * @param query The query function.
 * @returns The first resolved value or null if no registry matched the query.
 * Can also return the first error that caused a query to fail.
 */
export function queryAllRegistriesLazy<TValue>(
  sources: ReadonlyArray<Registry>,
  query: (source: Registry) => Promise<TValue | null>
): Promise<FromRegistry<TValue> | null> {
  async function queryRecursively(
    remainingSources: ReadonlyArray<Registry>
  ): Promise<FromRegistry<TValue> | null> {
    // If there are no more sources to search then can return with null
    if (remainingSources.length === 0) return null;

    // Determine current and fallback sources
    const currentSource = remainingSources[0]!;
    const fallbackSources = remainingSources.slice(1);

    // Query the current source first
    const maybeValue = await query(currentSource);
    // Afterward check if we got a value.
    // If yes we can return it, otherwise we enter the next level
    // of the recursion with the remaining registries.
    return maybeValue !== null
      ? { value: maybeValue, source: currentSource.url }
      : await queryRecursively(fallbackSources);
  }

  return queryRecursively(sources);
}
