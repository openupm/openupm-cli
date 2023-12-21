import nock from "nock";
import { SearchEndpointResult } from "./types";
import { isDomainName } from "../src/types/domain-name";
import assert from "assert";
import { registryUrl } from "../src/types/registry-url";
import { PkgInfo } from "../src/types/pkg-info";

export const unityRegistryUrl = registryUrl("https://packages.unity.com");
export const exampleRegistryUrl = registryUrl("http://example.com");

export function startMockRegistry() {
  if (!nock.isActive()) nock.activate();
}

export function registerRemotePkg(pkg: PkgInfo) {
  nock(exampleRegistryUrl)
    .persist()
    .get(`/${pkg.name}`)
    .reply(200, pkg, { "Content-Type": "application/json" });
}

export function registerRemoteUpstreamPkg(pkg: PkgInfo) {
  nock(unityRegistryUrl).persist().get(`/${pkg.name}`).reply(200, pkg, {
    "Content-Type": "application/json",
  });
  nock(exampleRegistryUrl).persist().get(`/${pkg.name}`).reply(404);
}

export function registerMissingPackage(name: string) {
  assert(isDomainName(name));
  nock(exampleRegistryUrl).persist().get(`/${name}`).reply(404);
  nock(unityRegistryUrl).persist().get(`/${name}`).reply(404);
}

export function registerSearchResult(
  searchText: string,
  result: SearchEndpointResult
) {
  nock(exampleRegistryUrl)
    .get(new RegExp(`-\\/v1\\/search\\?text=${searchText}`))
    .reply(200, result, {
      "Content-Type": "application/json",
    });
}

export function stopMockRegistry() {
  nock.restore();
  nock.cleanAll();
}
