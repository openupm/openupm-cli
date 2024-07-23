/**
 * Splits a string into two parts at the first occurrence of a specific
 * substring.
 * @param s The string to split.
 * @param split The delimiter. This string is expected to be only one character
 * long.
 * @returns The split string as a tuple, with string before and after the
 * delimiter as its elements. The second element might be null
 * if the string did not contain the delimiter and the string was not split.
 */
export function trySplitAtFirstOccurrenceOf(
  s: string,
  split: string
): [string, string | null] {
  const elements = s.split(split);
  if (elements.length === 1) return [s, null];
  return [elements[0]!, elements.slice(1).join(split)];
}

/**
 * Removes trailing slash from a string.
 * @param s The string.
 */
export function removeTrailingSlash<T extends string>(s: T): T {
  if (s.endsWith("/")) return s.slice(0, -1) as T;
  return s;
}
