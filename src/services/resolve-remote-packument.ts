import { AsyncResult, Ok } from "ts-results-es";
import { UnityPackument } from "../domain/packument";
import { Registry } from "../domain/registry";
import { DomainName } from "../domain/domain-name";
import { FetchPackument, FetchPackumentError } from "../io/packument-io";
import { RegistryUrl } from "../domain/registry-url";

/**
 * A resolved remote Unity packument.
 */
export type ResolvedPackument = {
  /**
   * The packument.
   */
  packument: UnityPackument;
  /**
   * The url of the registry from which the packument was resolved.
   */
  source: RegistryUrl;
};

/**
 * Error which may occur when resolving a remote packument.
 */
export type ResolveRemotePackumentError = FetchPackumentError;

/**
 * Function for resolving a remote packument. Here "resolve" means searching
 * a list of registries and returning the first found packument.
 * @param packageName The name of the packument to search.
 * @param sources A list of registries which should be searched in order.
 * @returns The first found packument or null if not found in any registry.
 */
export type ResolveRemotePackument = (
  packageName: DomainName,
  sources: ReadonlyArray<Registry>
) => AsyncResult<ResolvedPackument | null, ResolveRemotePackumentError>;

const noPackumentResult = <
  AsyncResult<ResolvedPackument | null, ResolveRemotePackumentError>
>Ok(null).toAsyncResult();

function withSource(
  source: Registry,
  packument: UnityPackument
): ResolvedPackument {
  return {
    packument,
    source: source.url,
  };
}

/**
 * Makes a {@link ResolveRemotePackument} function.
 */
export function makeRemotePackumentResolver(
  fetchPackument: FetchPackument
): ResolveRemotePackument {
  function tryResolveFrom(source: Registry, packageName: DomainName) {
    return fetchPackument(source, packageName).map((packument) =>
      packument !== null ? withSource(source, packument) : null
    );
  }

  const resolveRecursively: ResolveRemotePackument = (packageName, sources) => {
    if (sources.length === 0) return noPackumentResult;

    const currentSource = sources[0]!;
    const fallbackSources = sources.slice(1);

    return tryResolveFrom(currentSource, packageName).andThen(
      (maybePackument) =>
        maybePackument !== null
          ? Ok(maybePackument).toAsyncResult()
          : resolveRecursively(packageName, fallbackSources)
    );
  };

  return resolveRecursively;
}
