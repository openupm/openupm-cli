import * as resolveModule from "../src/packument-resolving";
import { tryResolveFromPackument } from "../src/packument-resolving";
import { Err } from "ts-results-es";
import { PackumentNotFoundError } from "../src/common-errors";
import { UnityPackument } from "../src/domain/packument";
import { RegistryUrl } from "../src/domain/registry-url";

type MockEntry = [RegistryUrl, UnityPackument];

/**
 * Mocks the results of {@link tryResolve}.
 * @param entries The entries of the mocked registry. Each entry contains
 * the url under which the packument is registered and the packument. All
 * packuments not given in this list are assumed to not exist.
 */
export function mockResolvedPackuments(...entries: MockEntry[]) {
  jest
    .spyOn(resolveModule, "tryResolve")
    .mockImplementation((_, name, requestedVersion, registry) => {
      const matchingEntry = entries.find(
        (entry) => entry[0] === registry.url && entry[1].name === name
      );
      if (matchingEntry === undefined)
        return Err(new PackumentNotFoundError()).toAsyncResult();

      const resolvedVersionResult = tryResolveFromPackument(
        matchingEntry[1],
        requestedVersion,
        matchingEntry[0]
      );
      return resolvedVersionResult.toAsyncResult();
    });
}
