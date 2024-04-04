import { InvalidArgumentError } from "@commander-js/extra-typings";

/**
 * @throws {InvalidArgumentError}
 */
type CliValueParser<TOut> = (input: string, previous?: TOut) => TOut;

export function mustSatisfy<TOut extends string>(
  typeAssertion: (input: string) => input is TOut,
  makeErrorMessage: (input: string) => string
): CliValueParser<TOut> {
  return (input) => {
    if (!typeAssertion(input))
      throw new InvalidArgumentError(makeErrorMessage(input));
    return input;
  };
}

export function mustBeParsable<TOut>(
  parse: (input: string) => TOut,
  makeErrorMessage: (input: string, error: unknown) => string
): CliValueParser<TOut> {
  return (input) => {
    try {
      return parse(input);
    } catch (error) {
      throw new InvalidArgumentError(makeErrorMessage(input, error));
    }
  };
}

export function eachValue<TOut>(
  parser: CliValueParser<TOut>
): CliValueParser<TOut[]> {
  return (input, previous) => {
    const parsed = parser(input);
    if (previous === undefined) return [parsed];
    else return [...previous, parsed];
  };
}
