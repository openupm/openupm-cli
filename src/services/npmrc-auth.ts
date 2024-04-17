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
 * Service for interacting with auth-information in a npmrc file.
 */
export interface NpmrcAuthService {
  /**
   * Attempts to update the user-wide npm-auth token inside a users npmrc file.
   * @param registry The registry for which to set the auth token.
   * @param token The auth token.
   * @returns The path of the file to which the token was ultimately saved.
   */
  trySetAuthToken(
    registry: RegistryUrl,
    token: string
  ): AsyncResult<string, NpmrcAuthTokenUpdateError>;
}

export function makeNpmrcAuthService(): NpmrcAuthService {
  return {
    trySetAuthToken(registry, token) {
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
    },
  };
}
