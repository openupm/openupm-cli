import { PkgInfo, PkgName } from "../src/types/global";
import nock from "nock";
import { SearchEndpointResult } from "./types";

const unityRegistryUrl = "https://packages.unity.com";
const registryUrl = "http://example.com";

export function startMockRegistry() {
  if (!nock.isActive()) nock.activate();
}

export function registerRemotePkg(pkg: PkgInfo) {
  nock(registryUrl)
    .persist()
    .get(`/${pkg.name}`)
    .reply(200, pkg, { "Content-Type": "application/json" });
}

export function registerRemoteUpstreamPkg(pkg: PkgInfo) {
  nock(unityRegistryUrl).persist().get(`/${pkg.name}`).reply(200, pkg, {
    "Content-Type": "application/json",
  });
  nock(registryUrl).persist().get(`/${pkg.name}`).reply(404);
}

export function registerMissingPackage(name: PkgName) {
  nock(registryUrl).persist().get(`/${name}`).reply(404);
  nock(unityRegistryUrl).persist().get(`/${name}`).reply(404);
}

export function registerSearchResult(
  searchText: string,
  result: SearchEndpointResult
) {
  nock(registryUrl)
    .get(new RegExp(`-\\/v1\\/search\\?text=${searchText}`))
    .reply(200, result, {
      "Content-Type": "application/json",
    });
}

export function stopMockRegistry() {
  nock.restore();
  nock.cleanAll();
}
