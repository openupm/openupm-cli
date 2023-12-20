export function trySplitAtFirstOccurrenceOf(
  s: string,
  split: string
): [string, string | undefined] {
  const elements = s.split(split);
  if (elements.length === 1) return [s, undefined];
  return [elements[0]!, elements.slice(1).join(split)];
}
