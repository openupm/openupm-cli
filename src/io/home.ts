import { Err, Ok, Result } from "ts-results-es";
import { RequiredEnvMissingError } from "./upm-config-io";
import { tryGetEnv } from "../utils/env-util";

/**
 * Attempts to get the current users home-directory.
 */
export function tryGetHomePath(): Result<string, RequiredEnvMissingError> {
  const homePath = tryGetEnv("USERPROFILE") ?? tryGetEnv("HOME");
  if (homePath === null)
    return Err(new RequiredEnvMissingError("USERPROFILE", "HOME"));
  return Ok(homePath);
}
