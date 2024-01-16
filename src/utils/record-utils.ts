/**
 * Same as {@link Object.entries} but preserves key type.
 * @param record The record to get entries for.
 */
export function recordEntries<TKey extends string | number | symbol, TValue>(
  record: Record<TKey, TValue>
): [TKey, TValue][] {
  return Object.entries(record) as unknown as [TKey, TValue][];
}

/**
 * Same as {@link Object.keys} but preserves key type.
 * @param record The record to get keys for.
 */
export function recordKeys<TKey extends string | number | symbol>(
  record: Record<TKey, unknown>
): TKey[] {
  return Object.keys(record) as unknown as TKey[];
}
