import { RegistryUrl } from "../domain/registry-url";
import { AsyncResult } from "ts-results-es";
import {
  FindNpmrcPath,
  LoadNpmrc,
  NpmrcLoadError,
  NpmrcSaveError,
  SaveNpmrc,
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
 * Function for updating the user-wide npm-auth token inside a users
 * npmrc file.
 * @param registry The registry for which to set the auth token.
 * @param token The auth token.
 * @returns The path of the file to which the token was ultimately saved.
 */
export type AuthNpmrc = (
  registry: RegistryUrl,
  token: string
) => AsyncResult<string, NpmrcAuthTokenUpdateError>;

export function makeAuthNpmrc(
  findPath: FindNpmrcPath,
  loadNpmrc: LoadNpmrc,
  saveNpmrc: SaveNpmrc
): AuthNpmrc {
  return (registry, token) => {
    // read config
    return findPath()
      .toAsyncResult()
      .andThen((configPath) =>
        loadNpmrc(configPath)
          .map((maybeNpmrc) => maybeNpmrc ?? emptyNpmrc)
          .map((npmrc) => setToken(npmrc, registry, token))
          .andThen((npmrc) => saveNpmrc(configPath, npmrc))
          .map(() => configPath)
      );
  };
}
