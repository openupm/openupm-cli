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
import { makeDomainName } from "../src/types/domain-name";
import { makeNpmClient } from "../src/npm-client";

const packageA = makeDomainName("package-a");

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
      const env = (
        await parseEnv({ _global: { registry: exampleRegistryUrl } }, false)
      ).unwrap();

      const packumentRemote = buildPackument(packageA);
      registerRemotePackument(packumentRemote);
      const result = await client.tryFetchPackument(env.registry, packageA)
        .promise;
      expect(result).toBeOk((packument) =>
        expect(packument).toEqual(packumentRemote)
      );
    });
    it("404", async function () {
      const env = (
        await parseEnv({ _global: { registry: exampleRegistryUrl } }, false)
      ).unwrap();

      registerMissingPackument(packageA);
      const result = await client.tryFetchPackument(env.registry, packageA)
        .promise;
      expect(result).toBeOk((packument) => expect(packument).toBeNull());
    });
  });
});
