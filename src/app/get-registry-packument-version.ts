import { AsyncResult, Err } from "ts-results-es";
import { PackumentNotFoundError } from "../domain/common-errors";
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
import { GetRegistryPackument } from "../io/packument-io";
import { resultifyAsyncOp } from "../domain/result-utils";

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
 * Resolves a specific packument version.
 * @param fetchPackument IO function for fetching remote packages.
 * @param packageName The name of the package to resolve.
 * @param requestedVersion The version that should be resolved.
 * @param source The registry to resolve the packument from.
 * @returns The resolved packument or an error.
 */
export function FetchRegistryPackumentVersion(
  fetchPackument: GetRegistryPackument,
  packageName: DomainName,
  requestedVersion: ResolvableVersion,
  source: Registry
): AsyncResult<ResolvedPackumentVersion, ResolvePackumentVersionError> {
  return resultifyAsyncOp<UnityPackument | null, ResolvePackumentVersionError>(
    fetchPackument(source, packageName)
  ).andThen((packument) => {
    if (packument === null) return Err(new PackumentNotFoundError(packageName));
    return tryResolvePackumentVersion(packument, requestedVersion).map(
      (packumentVersion) => ({
        packument,
        packumentVersion,
        source: source.url,
      })
    );
  });
}
