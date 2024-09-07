/**
 * Compares two arrays to see if they are equal (i.e. Have the same length
 * and equal elements). Elements are compared using `===`.
 * @param a The first array.
 * @param b The second array.
 */
export function areArraysEqual<T>(
  a: ReadonlyArray<T>,
  b: ReadonlyArray<T>
): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
