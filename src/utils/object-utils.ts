/**
 * Deletes a property from an object in an immutable way. The original object is
 * not modified. Instead a shallow copy of the object, without the key is
 * created.
 * @param obj The original object.
 * @param key The key to remove.
 * @returns A copy of the object without the key.
 */
export function omitKey<T extends object, TKey extends keyof T>(
  obj: T,
  key: TKey
): Omit<T, TKey> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}
