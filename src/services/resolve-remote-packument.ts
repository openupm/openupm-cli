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

/**
 * Makes a {@link ResolveRemotePackument} function.
 */
export function makeRemotePackumentResolver(
  fetchPackument: FetchPackument
): ResolveRemotePackument {
  return (packageName, sources) =>
    sources.reduce(
      (prevResult, source) =>
        prevResult.andThen((foundPackument) =>
          foundPackument !== null
            ? Ok(foundPackument).toAsyncResult()
            : fetchPackument(source, packageName).map((packument) =>
                packument !== null
                  ? {
                      packument,
                      source: source.url,
                    }
                  : null
              )
        ),
      <AsyncResult<ResolvedPackument | null, ResolveRemotePackumentError>>(
        Ok(null).toAsyncResult()
      )
    );
}
