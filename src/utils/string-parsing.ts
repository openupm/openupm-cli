import TOML, { AnyJson, JsonMap } from "@iarna/toml";
import { Result } from "ts-results-es";
import { CustomError } from "ts-custom-error";
import yaml from "yaml";
import { assertIsError } from "./error-type-guards";

/**
 * Error for when a string could not be parsed to a specific format.
 */
export class StringFormatError extends CustomError {
  // noinspection JSUnusedLocalSymbols
  private readonly _class = "StringFormatError";

  public constructor(
    /**
     * Description of the format the string was supposed to be parsed to.
     */
    public readonly formatName: string,
    /**
     * The error which caused the parsing failure.
     */
    public readonly cause: Error
  ) {
    super();
  }
}

function makeParser<T>(
  formatName: string,
  parsingFunction: (x: string) => T
): (x: string) => Result<T, StringFormatError> {
  return (input) =>
    Result.wrap(() => parsingFunction(input)).mapErr((error) => {
      assertIsError(error);
      return new StringFormatError(formatName, error);
    });
}

/**
 * Attempts to parse a json-string.
 * @param json The string to be parsed.
 */
export const tryParseJson = makeParser<AnyJson>("Json", JSON.parse);

/**
 * Attempts to parse a toml-string.
 * @param toml The string to be parsed.
 */
export const tryParseToml = makeParser<JsonMap>("Toml", TOML.parse);

/**
 * Attempts to parse a yaml-string.
 * @param input The string to be parsed.
 */
export const tryParseYaml = makeParser<AnyJson>("Yaml", yaml.parse);
