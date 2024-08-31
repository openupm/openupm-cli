/**
 * Partially applies a a function.
 * @param func The function to partially apply.
 * @param args The arguments to apply.
 * @returns A new function with only the remaining arguments.
 * @see https://en.wikipedia.org/wiki/Partial_application
 * @see https://kyleshevlin.com/just-enough-fp-partial-application/
 */
export function partialApply<
  TArgs extends unknown[],
  TRest extends unknown[],
  TOut
>(
  func: (...args: [...TArgs, ...TRest]) => TOut,
  ...args: TArgs
): (...args: TRest) => TOut {
  return (...rest) => func(...args, ...rest);
}
