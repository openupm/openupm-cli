/**
 * Same as {@link Object.entries} but preserves key type.
 * @param record The record to get entries for.
 */
export function recordEntries<TKey extends string | number | symbol, TValue>(
  record: Record<TKey, TValue>
): [TKey, TValue][] {
  return Object.entries(record) as unknown as [TKey, TValue][];
}
