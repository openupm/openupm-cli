import { Registry } from "../domain/registry";
import { DomainName } from "../domain/domain-name";
import { AsyncResult, Err, Ok } from "ts-results-es";
import { SemanticVersion } from "../domain/semantic-version";
import { PackumentNotFoundError } from "../common-errors";
import {
  NoVersionsError,
  tryResolvePackumentVersion,
} from "../domain/packument";
import { FetchPackument, FetchPackumentError } from "../io/packument-io";
import { FromRegistry, queryAllRegistriesLazy } from "../utils/sources";

/**
 * Error which may occur when resolving the latest version for a package.
 */
export type ResolveLatestVersionError =
  | PackumentNotFoundError
  | FetchPackumentError
  | NoVersionsError;

/**
 * Service for resolving the latest published version of a package.
 * @param sources All sources to check for the package.
 * @param packageName The name of the package to search.
 */
export type ResolveLatestVersion = (
  sources: ReadonlyArray<Registry>,
  packageName: DomainName
) => AsyncResult<FromRegistry<SemanticVersion>, ResolveLatestVersionError>;

export function makeResolveLatestVersion(
  fetchPackument: FetchPackument
): ResolveLatestVersion {
  function tryResolveFrom(
    source: Registry,
    packageName: DomainName
  ): AsyncResult<SemanticVersion | null, ResolveLatestVersionError> {
    return fetchPackument(source, packageName).andThen((maybePackument) => {
      if (maybePackument === null) return Ok(null);
      return tryResolvePackumentVersion(maybePackument, "latest").map(
        (it) => it.version
      );
    });
  }

  return (sources, packageName) =>
    queryAllRegistriesLazy(sources, (source) =>
      tryResolveFrom(source, packageName)
    ).andThen((resolved) =>
      resolved !== null
        ? Ok(resolved)
        : Err(new PackumentNotFoundError(packageName))
    );
}
