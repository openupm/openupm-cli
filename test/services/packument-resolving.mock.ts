import { Err } from "ts-results-es";
import { PackumentNotFoundError } from "../../src/common-errors";
import {
  tryResolvePackumentVersion,
  UnityPackument,
} from "../../src/domain/packument";
import { RegistryUrl } from "../../src/domain/registry-url";
import { ResolveRemotePackumentVersion } from "../../src/services/resolve-remote-packument-version";

type MockEntry = [RegistryUrl, UnityPackument];

/**
 * Mocks the results of a {@link ResolveRemotePackumentVersion}.
 * @param resolveRemovePackumentVersion The service to mock.
 * @param entries The entries of the mocked registry. Each entry contains
 * the url under which the packument is registered and the packument. All
 * packuments not given in this list are assumed to not exist.
 */
export function mockResolvedPackuments(
  resolveRemovePackumentVersion: jest.MockedFunction<ResolveRemotePackumentVersion>,
  ...entries: MockEntry[]
) {
  return resolveRemovePackumentVersion.mockImplementation(
    (name, requestedVersion, registry) => {
      const matchingEntry = entries.find(
        (entry) => entry[0] === registry.url && entry[1].name === name
      );
      if (matchingEntry === undefined)
        return Err(new PackumentNotFoundError(name)).toAsyncResult();

      const source = matchingEntry[0];
      const packument = matchingEntry[1];
      return tryResolvePackumentVersion(packument, requestedVersion)
        .map((packumentVersion) => ({ packument, packumentVersion, source }))
        .toAsyncResult();
    }
  );
}
