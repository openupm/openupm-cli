import { AsyncResult } from "ts-results-es";
import { UnityPackument } from "../domain/packument";
import { Registry } from "../domain/registry";
import { DomainName } from "../domain/domain-name";
import { FetchPackument, FetchPackumentError } from "../io/packument-io";
import { FromRegistry, queryAllRegistriesLazy } from "../utils/sources";

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
) => AsyncResult<
  FromRegistry<UnityPackument> | null,
  ResolveRemotePackumentError
>;

/**
 * Makes a {@link ResolveRemotePackument} function.
 */
export function makeResolveRemotePackument(
  fetchPackument: FetchPackument
): ResolveRemotePackument {
  return (packageName, sources) =>
    queryAllRegistriesLazy(sources, (source) =>
      fetchPackument(source, packageName)
    );
}
