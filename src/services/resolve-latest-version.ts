import { Registry } from "../domain/registry";
import { DomainName } from "../domain/domain-name";
import { AsyncResult, Err, Ok } from "ts-results-es";
import { SemanticVersion } from "../domain/semantic-version";
import { PackumentNotFoundError } from "../common-errors";
import { FetchPackumentError, FetchPackumentService } from "./fetch-packument";
import { tryGetLatestVersion } from "../domain/packument";
import { recordKeys } from "../utils/record-utils";
import { NoVersionsError } from "../packument-resolving";

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
export type ResolveLatestVersionService = (
  sources: ReadonlyArray<Registry>,
  packageName: DomainName
) => AsyncResult<SemanticVersion, ResolveLatestVersionError>;

export function makeResolveLatestVersionService(
  fetchPackument: FetchPackumentService
): ResolveLatestVersionService {
  const resolveLatestVersion: ResolveLatestVersionService = (
    sources,
    packageName
  ) => {
    if (sources.length === 0)
      return Err(new PackumentNotFoundError()).toAsyncResult();

    const sourceToCheck = sources[0]!;
    return fetchPackument(sourceToCheck, packageName).andThen(
      (maybePackument) => {
        if (maybePackument === null)
          return resolveLatestVersion(sources.slice(1), packageName);

        const latestVersion = tryGetLatestVersion(maybePackument);
        if (latestVersion !== undefined) return Ok(latestVersion);

        const availableVersions = recordKeys(maybePackument.versions);
        if (availableVersions.length === 0)
          return Err(new NoVersionsError()).toAsyncResult();

        return Ok(availableVersions.at(-1)!);
      }
    );
  };

  return resolveLatestVersion;
}
