import RegClient from "another-npm-registry-client";
import { AsyncResult, Err } from "ts-results-es";
import { PackumentNotFoundError } from "../common-errors";
import { DomainName } from "../domain/domain-name";
import { ResolvableVersion } from "../domain/package-reference";
import {
  ResolvePackumentVersionError,
  tryResolvePackumentVersion,
  UnityPackument,
  UnityPackumentVersion,
} from "../domain/packument";
import { Registry } from "../domain/registry";
import { RegistryUrl } from "../domain/registry-url";
import {
  GetRegistryPackument,
  getRegistryPackumentUsing,
} from "../io/packument-io";
import { DebugLog } from "../logging";
import { resultifyAsyncOp } from "../utils/result-utils";

/**
 * A successfully resolved packument-version.
 */
export interface ResolvedPackumentVersion {
  /**
   * The packument from which the version was resolved.
   */
  readonly packument: UnityPackument;
  /**
   * The resolved packument-version.
   */
  readonly packumentVersion: UnityPackumentVersion;
  /**
   * The source from which the packument was resolved.
   */
  readonly source: RegistryUrl;
}

/**
 * Function for resolving a specific packument version.
 * @param packageName The name of the package to resolve.
 * @param requestedVersion The version that should be resolved.
 * @param source The registry to resolve the packument from.
 */
export type GetRegistryPackumentVersion = (
  packageName: DomainName,
  requestedVersion: ResolvableVersion,
  source: Registry
) => AsyncResult<ResolvedPackumentVersion, ResolvePackumentVersionError>;

/**
 * Makes a {@link GetRegistryPackumentVersion} function which fetches the
 * packument version from a remote npm registry.
 */
export function FetchRegistryPackumentVersion(
  getRegistryPackument: GetRegistryPackument
): GetRegistryPackumentVersion {
  return (packageName, requestedVersion, source) =>
    resultifyAsyncOp<UnityPackument | null, ResolvePackumentVersionError>(
      getRegistryPackument(source, packageName)
    ).andThen((packument) => {
      if (packument === null)
        return Err(new PackumentNotFoundError(packageName));
      return tryResolvePackumentVersion(packument, requestedVersion).map(
        (packumentVersion) => ({
          packument,
          packumentVersion,
          source: source.url,
        })
      );
    });
}

/**
 * Default {@link GetRegistryPackumentVersion} function. Uses {@link FetchRegistryPackumentVersion}.
 */
export const getRegistryPackumentVersionUsing = (
  regClient: RegClient.Instance,
  debugLog: DebugLog
) =>
  FetchRegistryPackumentVersion(getRegistryPackumentUsing(regClient, debugLog));
