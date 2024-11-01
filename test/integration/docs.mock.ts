import nock from "nock";
import type { DomainName } from "../../src/domain/domain-name.js";

/**
 * Mocks which packages have an entry on the Unity documentation.
 * @param packages The packages which should have a documentation page. All
 * other packages will not have a documentation page.
 */
export function mockUnityDocPages(packages: ReadonlyArray<DomainName>) {
  const scope = nock("https://docs.unity3d.com/Manual").persist();

  packages.forEach((it) => scope.head(`/${it}.html`).reply(200));

  scope.head(/.*/).reply(404);
}
