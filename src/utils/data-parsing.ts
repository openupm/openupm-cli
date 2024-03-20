import { AnyJson } from "@iarna/toml";
import { Result } from "ts-results-es";

/**
 * Attempts to parse a json-string.
 * @param json The string to be parsed.
 */
export function tryParseJson(json: string): Result<AnyJson, SyntaxError> {
  return Result.wrap(() => JSON.parse(json));
}
