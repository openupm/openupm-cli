import { RegistryUrl } from "../domain/registry-url";
import { AsyncResult } from "ts-results-es";
import {
  FindNpmrcPath,
  NpmrcLoadError,
  NpmrcSaveError,
  tryLoadNpmrc,
  trySaveNpmrc,
} from "../io/npmrc-io";
import { emptyNpmrc, setToken } from "../domain/npmrc";
import { RequiredEnvMissingError } from "../io/upm-config-io";
import { ReadTextFile } from "../io/file-io";

/**
 * Error that might occur when updating an auth-token inside a npmrc file.
 */
export type NpmrcAuthTokenUpdateError =
  | RequiredEnvMissingError
  | NpmrcLoadError
  | NpmrcSaveError;

/**
 * Service function for updating the user-wide npm-auth token inside a users
 * npmrc file.
 * @param registry The registry for which to set the auth token.
 * @param token The auth token.
 * @returns The path of the file to which the token was ultimately saved.
 */
export type AuthNpmrcService = (
  registry: RegistryUrl,
  token: string
) => AsyncResult<string, NpmrcAuthTokenUpdateError>;

export function makeAuthNpmrcService(
  findPath: FindNpmrcPath,
  readFile: ReadTextFile
): AuthNpmrcService {
  return (registry, token) => {
    // read config
    return findPath()
      .toAsyncResult()
      .andThen((configPath) =>
        tryLoadNpmrc(readFile, configPath)
          .map((maybeNpmrc) => maybeNpmrc ?? emptyNpmrc)
          .map((npmrc) => setToken(npmrc, registry, token))
          .andThen((npmrc) => trySaveNpmrc(configPath, npmrc))
          .map(() => configPath)
      );
  };
}
