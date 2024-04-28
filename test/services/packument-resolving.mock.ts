import { tryResolvePackumentVersion } from "../../src/packument-resolving";
import { Err } from "ts-results-es";
import { PackumentNotFoundError } from "../../src/common-errors";
import { UnityPackument } from "../../src/domain/packument";
import { RegistryUrl } from "../../src/domain/registry-url";
import { ResolveRemotePackumentService } from "../../src/services/resolve-remote-packument";

type MockEntry = [RegistryUrl, UnityPackument];

/**
 * Mocks the results of a {@link ResolveRemotePackumentService}.
 * @param resolveRemotePackument The service to mock.
 * @param entries The entries of the mocked registry. Each entry contains
 * the url under which the packument is registered and the packument. All
 * packuments not given in this list are assumed to not exist.
 */
export function mockResolvedPackuments(
  resolveRemotePackument: jest.MockedFunction<ResolveRemotePackumentService>,
  ...entries: MockEntry[]
) {
  return resolveRemotePackument.mockImplementation(
    (name, requestedVersion, registry) => {
      const matchingEntry = entries.find(
        (entry) => entry[0] === registry.url && entry[1].name === name
      );
      if (matchingEntry === undefined)
        return Err(new PackumentNotFoundError()).toAsyncResult();

      const source = matchingEntry[0];
      const packument = matchingEntry[1];
      return tryResolvePackumentVersion(packument, requestedVersion)
        .map((packumentVersion) => ({ packument, packumentVersion, source }))
        .toAsyncResult();
    }
  );
}
