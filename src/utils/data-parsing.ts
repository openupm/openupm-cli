import TOML, { AnyJson, JsonMap } from "@iarna/toml";
import { Result } from "ts-results-es";
import { CustomError } from "ts-custom-error";

/**
 * Error for when a string could not be parsed to a specific format.
 */
export class StringFormatError extends CustomError {
  // noinspection JSUnusedLocalSymbols
  private readonly _class = "StringFormatError";

  public constructor(public readonly formatName: string) {
    super();
  }
}

/**
 * Attempts to parse a json-string.
 * @param json The string to be parsed.
 */
export function tryParseJson(json: string): Result<AnyJson, StringFormatError> {
  return Result.wrap(() => JSON.parse(json)).mapErr(
    () => new StringFormatError("Json")
  );
}

/**
 * Attempts to parse a toml-string.
 * @param toml The string to be parsed.
 */
export function tryParseToml(toml: string): Result<JsonMap, StringFormatError> {
  return Result.wrap(() => TOML.parse(toml)).mapErr(
    () => new StringFormatError("Toml")
  );
}
