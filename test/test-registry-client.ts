import "assert";
import "should";
import { parseEnv } from "../src/utils/env";
import { fetchPackument, getNpmClient } from "../src/registry-client";
import {
  exampleRegistryUrl,
  registerMissingPackument,
  registerRemotePackument,
  startMockRegistry,
  stopMockRegistry,
} from "./mock-registry";
import should from "should";
import { buildPackument } from "./data-packument";
import { domainName } from "../src/types/domain-name";

const packageA = domainName("package-a");

describe("registry-client", function () {
  describe("fetchPackageInfo", function () {
    const client = getNpmClient();

    beforeEach(function () {
      startMockRegistry();
    });
    afterEach(function () {
      stopMockRegistry();
    });
    it("simple", async function () {
      const env = await parseEnv(
        { _global: { registry: exampleRegistryUrl } },
        false
      );
      should(env).not.be.null();
      const packumentRemote = buildPackument(packageA);
      registerRemotePackument(packumentRemote);
      const info = await fetchPackument(env!.registry, packageA, client);
      should(info).deepEqual(packumentRemote);
    });
    it("404", async function () {
      const env = await parseEnv(
        { _global: { registry: exampleRegistryUrl } },
        false
      );
      should(env).not.be.null();
      registerMissingPackument(packageA);
      const info = await fetchPackument(env!.registry, packageA, client);
      (info === undefined).should.be.ok();
    });
  });
});
