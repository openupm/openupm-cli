import { Registry } from "../domain/registry";
import { AsyncResult } from "ts-results-es";
import { RegistryUrl } from "../domain/registry-url";
import { AsyncOk } from "./result-utils";

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
export function queryAllRegistriesLazy<TValue, TError>(
  sources: ReadonlyArray<Registry>,
  query: (source: Registry) => AsyncResult<TValue | null, TError>
): AsyncResult<FromRegistry<TValue> | null, TError> {
  function queryRecursively(
    remainingSources: ReadonlyArray<Registry>
  ): AsyncResult<FromRegistry<TValue> | null, TError> {
    // If there are no more sources to search then can return with null
    if (remainingSources.length === 0) return AsyncOk(null);

    // Determine current and fallback sources
    const currentSource = remainingSources[0]!;
    const fallbackSources = remainingSources.slice(1);

    // Query the current source first
    return query(currentSource).andThen((maybeValue) =>
      // Afterward check if we got a value.
      // If yes we can return it, otherwise we enter the next level
      // of the recursion with the remaining registries.
      maybeValue !== null
        ? AsyncOk({ value: maybeValue, source: currentSource.url })
        : queryRecursively(fallbackSources)
    );
  }

  return queryRecursively(sources);
}
