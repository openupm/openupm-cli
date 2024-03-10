import "assert";

import { parseEnv } from "../src/utils/env";
import {
  exampleRegistryUrl,
  registerMissingPackument,
  registerRemotePackument,
  startMockRegistry,
  stopMockRegistry,
} from "./mock-registry";
import { buildPackument } from "./data-packument";
import { domainName } from "../src/types/domain-name";
import { makeNpmClient } from "../src/npm-client";

const packageA = domainName("package-a");

describe("registry-client", function () {
  describe("fetchPackageInfo", function () {
    const client = makeNpmClient();

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
      expect(env).not.toBeNull();
      const packumentRemote = buildPackument(packageA);
      registerRemotePackument(packumentRemote);
      const info = await client.tryFetchPackument(env!.registry, packageA);
      expect(info).toEqual(packumentRemote);
    });
    it("404", async function () {
      const env = await parseEnv(
        { _global: { registry: exampleRegistryUrl } },
        false
      );
      expect(env).not.toBeNull();
      registerMissingPackument(packageA);
      const info = await client.tryFetchPackument(env!.registry, packageA);
      expect(info).toBeNull();
    });
  });
});
