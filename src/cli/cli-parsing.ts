import { InvalidArgumentError } from "@commander-js/extra-typings";

/**
 * @throws {InvalidArgumentError}
 */
type CliValueParser<TOut> = (input: string, previous?: TOut) => TOut;

/**
 * Makes a {@CliValueParser} which checks that the input string matches
 * a type assertion function. If the assertion holds then the input type is
 * narrowed.
 * @param typeAssertion The assertion to check against.
 * @param makeErrorMessage Function for generating error messages if the
 * assertion fails.
 */
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

/**
 * Makes a {@CliValueParser} which attempts to pass the input string through
 * a parsing function. The parser fails if the parsing function throws.
 * @param parse The parsing function.
 * @param makeErrorMessage Function for generating error messages if the
 * parsing function fails.
 */
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

/**
 * Makes a {@link CliValueParser} that applies an existing value parser to
 * a series of string inputs and produces an array of outputs. Fails if any
 * individual parsing failed.
 * @param parser The parser to apply to the inputs.
 */
export function eachValue<TOut>(
  parser: CliValueParser<TOut>
): CliValueParser<TOut[]> {
  return (input, previous) => {
    const parsed = parser(input);
    if (previous === undefined) return [parsed];
    else return [...previous, parsed];
  };
}
