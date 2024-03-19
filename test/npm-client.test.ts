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
      const packumentRemote = buildPackument(packageA);
      registerRemotePackument(packumentRemote);

      const result = await client.tryFetchPackument(exampleRegistry, packageA)
        .promise;

      expect(result).toBeOk((packument) =>
        expect(packument).toEqual(packumentRemote)
      );
    });

    it("404", async function () {
      registerMissingPackument(packageA);

      const result = await client.tryFetchPackument(exampleRegistry, packageA)
        .promise;

      expect(result).toBeOk((packument) => expect(packument).toBeNull());
    });
  });
});
