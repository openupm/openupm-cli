import nock from "nock";
import { isDomainName } from "../src/domain/domain-name";
import assert from "assert";
import { unityRegistryUrl } from "../src/domain/registry-url";
import { UnityPackument } from "../src/domain/packument";
import { exampleRegistryUrl } from "./data-registry";

export function startMockRegistry() {
  if (!nock.isActive()) nock.activate();
}

export function registerRemotePackument(packument: UnityPackument) {
  nock(exampleRegistryUrl)
    .persist()
    .get(`/${packument.name}`)
    .reply(200, packument, { "Content-Type": "application/json" });
  nock(unityRegistryUrl).persist().get(`/${packument.name}`).reply(404);
}

export function registerRemoteUpstreamPackument(packument: UnityPackument) {
  nock(unityRegistryUrl)
    .persist()
    .get(`/${packument.name}`)
    .reply(200, packument, {
      "Content-Type": "application/json",
    });
  nock(exampleRegistryUrl).persist().get(`/${packument.name}`).reply(404);
}

export function registerMissingPackument(name: string) {
  assert(isDomainName(name));
  nock(exampleRegistryUrl).persist().get(`/${name}`).reply(404);
  nock(unityRegistryUrl).persist().get(`/${name}`).reply(404);
}

export function stopMockRegistry() {
  nock.restore();
  nock.cleanAll();
}
