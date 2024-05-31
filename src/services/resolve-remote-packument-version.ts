import { DomainName } from "../domain/domain-name";
import { Registry } from "../domain/registry";
import { AsyncResult, Err, Ok } from "ts-results-es";
import {
  PackumentVersionResolveError,
  ResolvableVersion,
  ResolvedPackumentVersion,
} from "../packument-version-resolving";
import { PackumentNotFoundError } from "../common-errors";
import { tryResolvePackumentVersion } from "../domain/packument";
import { FetchPackument, FetchPackumentError } from "../io/packument-io";

/**
 * Error which may occur when resolving a remove packument version.
 */
export type ResolveRemotePackumentVersionError =
  | PackumentVersionResolveError
  | FetchPackumentError;

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
) => AsyncResult<ResolvedPackumentVersion, ResolveRemotePackumentVersionError>;

/**
 * Makes a {@link ResolveRemotePackumentVersion} function.
 */
export function makeResolveRemotePackumentVersion(
  fetchPackument: FetchPackument
): ResolveRemotePackumentVersion {
  return (packageName, requestedVersion, source) =>
    fetchPackument(source, packageName)
      .andThen((maybePackument) => {
        if (maybePackument === null)
          return Err(new PackumentNotFoundError(packageName));
        return Ok(maybePackument);
      })
      .andThen((packument) =>
        tryResolvePackumentVersion(packument, requestedVersion).map(
          (packumentVersion) => ({
            packument,
            packumentVersion,
            source: source.url,
          })
        )
      );
}
