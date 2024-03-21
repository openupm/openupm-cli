import "assert";
import {
  exampleRegistryUrl,
  registerMissingPackument,
  registerRemotePackument,
  startMockRegistry,
  stopMockRegistry,
} from "./mock-registry";
import { buildPackument } from "./data-packument";
import { makeDomainName } from "../src/types/domain-name";
import { makeNpmClient, Registry } from "../src/npm-client";

const packageA = makeDomainName("package-a");

const exampleRegistry: Registry = {
  url: exampleRegistryUrl,
  auth: null,
};

describe("registry-client", () => {
  describe("fetchPackageInfo", () => {
    const client = makeNpmClient();

    beforeEach(function () {
      startMockRegistry();
    });

    afterEach(function () {
      stopMockRegistry();
    });

    it("should get known packument", async function () {
      const packumentRemote = buildPackument(packageA);
      registerRemotePackument(packumentRemote);

      const result = await client.tryFetchPackument(exampleRegistry, packageA)
        .promise;

      expect(result).toBeOk((packument) =>
        expect(packument).toEqual(packumentRemote)
      );
    });

    it("should fail for unknown packument", async function () {
      registerMissingPackument(packageA);

      const result = await client.tryFetchPackument(exampleRegistry, packageA)
        .promise;

      expect(result).toBeOk((packument) => expect(packument).toBeNull());
    });
  });
});
