import { Registry } from "../domain/registry";
import { DomainName } from "../domain/domain-name";
import { AsyncResult, Err, Ok } from "ts-results-es";
import { SemanticVersion } from "../domain/semantic-version";
import { PackumentNotFoundError } from "../common-errors";
import { NoVersionsError, tryGetLatestVersion } from "../domain/packument";
import { recordKeys } from "../utils/record-utils";
import { FetchPackument, FetchPackumentError } from "../io/packument-io";
import { AsyncOk } from "../utils/result-utils";

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
) => AsyncResult<SemanticVersion, ResolveLatestVersionError>;

export function makeResolveLatestVersion(
  fetchPackument: FetchPackument
): ResolveLatestVersion {
  function tryResolveFrom(
    packageName: DomainName,
    source: Registry
  ): AsyncResult<SemanticVersion | null, ResolveLatestVersionError> {
    return fetchPackument(source, packageName).andThen((maybePackument) => {
      if (maybePackument === null) return Ok(null);

      const latestVersion = tryGetLatestVersion(maybePackument);
      if (latestVersion !== undefined) return Ok(latestVersion);

      const availableVersions = recordKeys(maybePackument.versions);
      if (availableVersions.length === 0)
        return Err(new NoVersionsError()).toAsyncResult();

      return Ok(availableVersions.at(-1)!);
    });
  }

  const resolveRecursively: ResolveLatestVersion = (sources, packageName) => {
    if (sources.length === 0)
      return Err(new PackumentNotFoundError(packageName)).toAsyncResult();

    const currentSource = sources[0]!;
    const fallbackSources = sources.slice(1);

    return tryResolveFrom(packageName, currentSource).andThen(
      (maybePackument) =>
        // Afterward check if we got a packument.
        // If yes we can return it, otherwhise we enter the next level
        // of the recursion with the remaining registries.
        maybePackument !== null
          ? AsyncOk(maybePackument)
          : resolveRecursively(fallbackSources, packageName)
    );
  };

  return resolveRecursively;
}
