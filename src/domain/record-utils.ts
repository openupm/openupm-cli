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

/**
 * Removes the property with a specific key from a record.
 * @param record The record.
 * @param key The key.
 * @returns A new record without the key.
 */
export function removeRecordKey<
  TKey extends string | number | symbol,
  TValue,
  TKeyToRemove extends TKey
>(
  record: Record<TKey, TValue>,
  key: TKeyToRemove
): Record<Exclude<TKey, TKeyToRemove>, TValue> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [key]: _, ...withOutKey } = record;
  return withOutKey;
}
