import nock from "nock";
import type { UnityPackument } from "../../src/domain/packument";
import type { RegistryUrl } from "../../src/domain/registry-url";

/**
 * Mocks which packuments exist on a remote package registry.
 * @param registryUrl The registries url.
 * @param packuments The packuments that are on the registry. Every other
 * package is assumed to be missing.
 */
export function mockRegistryPackuments(
  registryUrl: RegistryUrl,
  packuments: ReadonlyArray<UnityPackument>
) {
  const scope = nock(registryUrl).persist();

  packuments.forEach((packument) =>
    scope.get(`/${packument.name}`).reply(200, JSON.stringify(packument), {
      "Content-Type": "application/json",
    })
  );

  scope.get(/.*/).reply(404);
}
