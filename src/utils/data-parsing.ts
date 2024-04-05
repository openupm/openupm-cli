import TOML, { AnyJson, JsonMap } from "@iarna/toml";
import { Result } from "ts-results-es";

export type TomlParseError = Error;

/**
 * Attempts to parse a json-string.
 * @param json The string to be parsed.
 */
export function tryParseJson(json: string): Result<AnyJson, SyntaxError> {
  return Result.wrap(() => JSON.parse(json));
}

/**
 * Attempts to parse a toml-string.
 * @param toml The string to be parsed.
 */
export function tryParseToml(toml: string): Result<JsonMap, TomlParseError> {
  return Result.wrap(() => TOML.parse(toml));
}
