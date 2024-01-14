export function trySplitAtFirstOccurrenceOf(
  s: string,
  split: string
): [string, string | undefined] {
  const elements = s.split(split);
  if (elements.length === 1) return [s, undefined];
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
