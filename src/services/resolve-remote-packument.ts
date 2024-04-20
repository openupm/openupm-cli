import { DomainName } from "../domain/domain-name";
import { Registry } from "../domain/registry";
import { AsyncResult, Err, Ok } from "ts-results-es";
import {
  PackumentResolveError,
  ResolvableVersion,
  ResolvedPackument,
  tryResolveFromPackument,
} from "../packument-resolving";
import { HttpErrorBase } from "npm-registry-fetch";
import { PackumentNotFoundError } from "../common-errors";
import { FetchPackumentService } from "./fetch-packument";

/**
 * Service function for resolving remove packuments.
 * @param packageName The name of the package to resolve.
 * @param requestedVersion The version that should be resolved.
 * @param source The registry to resolve the packument from.
 */
export type ResolveRemotePackumentService = (
  packageName: DomainName,
  requestedVersion: ResolvableVersion,
  source: Registry
) => AsyncResult<ResolvedPackument, PackumentResolveError | HttpErrorBase>;

/**
 * Makes a {@link ResolveRemotePackumentService} function.
 */
export function makeResolveRemotePackumentService(
  fetchPackument: FetchPackumentService
): ResolveRemotePackumentService {
  return (packageName, requestedVersion, source) =>
    fetchPackument(source, packageName)
      .andThen((maybePackument) => {
        if (maybePackument === null) return Err(new PackumentNotFoundError());
        return Ok(maybePackument);
      })
      .andThen((packument) =>
        tryResolveFromPackument(packument, requestedVersion, source.url)
      );
}
