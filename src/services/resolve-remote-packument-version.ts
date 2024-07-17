import { DomainName } from "../domain/domain-name";
import { Registry } from "../domain/registry";
import { AsyncResult, Err } from "ts-results-es";
import { ResolvePackumentVersionError } from "../packument-version-resolving";
import { PackumentNotFoundError } from "../common-errors";
import {
  tryResolvePackumentVersion,
  UnityPackument,
  UnityPackumentVersion,
} from "../domain/packument";
import { FetchPackument } from "../io/packument-io";
import { resultifyAsyncOp } from "../utils/result-utils";
import { RegistryUrl } from "../domain/registry-url";
import { ResolvableVersion } from "../domain/package-reference";

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
 * Function for resolving remove packument versions.
 * @param packageName The name of the package to resolve.
 * @param requestedVersion The version that should be resolved.
 * @param source The registry to resolve the packument from.
 */
export type ResolveRemotePackumentVersion = (
  packageName: DomainName,
  requestedVersion: ResolvableVersion,
  source: Registry
) => AsyncResult<ResolvedPackumentVersion, ResolvePackumentVersionError>;

/**
 * Makes a {@link ResolveRemotePackumentVersion} function.
 */
export function makeResolveRemotePackumentVersion(
  fetchPackument: FetchPackument
): ResolveRemotePackumentVersion {
  return (packageName, requestedVersion, source) =>
    resultifyAsyncOp<UnityPackument | null, ResolvePackumentVersionError>(
      fetchPackument(source, packageName)
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
