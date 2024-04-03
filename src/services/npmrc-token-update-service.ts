import { RegistryUrl } from "../domain/registry-url";
import { AsyncResult } from "ts-results-es";
import {
  NpmrcLoadError,
  NpmrcSaveError,
  tryGetNpmrcPath,
  tryLoadNpmrc,
  trySaveNpmrc,
} from "../io/npmrc-io";
import { emptyNpmrc, setToken } from "../domain/npmrc";
import { RequiredEnvMissingError } from "../io/upm-config-io";

/**
 * Error that might occur when updating an auth-token inside a npmrc file.
 */
export type NpmrcAuthTokenUpdateError =
  | RequiredEnvMissingError
  | NpmrcLoadError
  | NpmrcSaveError;

/**
 * Attempts to update the npm-auth token inside the users npmrc file.
 * @returns The path to which the config was saved.
 */
export function tryUpdateNpmrcToken(
  registry: RegistryUrl,
  token: string
): AsyncResult<string, NpmrcAuthTokenUpdateError> {
  // read config
  return tryGetNpmrcPath()
    .toAsyncResult()
    .andThen((configPath) =>
      tryLoadNpmrc(configPath)
        .map((maybeNpmrc) => maybeNpmrc ?? emptyNpmrc)
        .map((npmrc) => setToken(npmrc, registry, token))
        .andThen((npmrc) => trySaveNpmrc(configPath, npmrc))
        .map(() => configPath)
    );
}
