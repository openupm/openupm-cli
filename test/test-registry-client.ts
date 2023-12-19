import "assert";
import "should";
import { parseEnv } from "../src/utils/env";
import { fetchPackageInfo } from "../src/registry-client";
import {
  exampleRegistryUrl,
  registerMissingPackage,
  registerRemotePkg,
  startMockRegistry,
  stopMockRegistry,
} from "./mock-registry";
import should from "should";
import { buildPackageInfo } from "./data-pkg-info";
import { domainName } from "../src/types/domain-name";

const packageA = domainName("package-a");

describe("registry-client", function () {
  describe("fetchPackageInfo", function () {
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
      const pkgInfoRemote = buildPackageInfo(packageA);
      registerRemotePkg(pkgInfoRemote);
      const info = await fetchPackageInfo(env!.registry, packageA);
      should(info).deepEqual(pkgInfoRemote);
    });
    it("404", async function () {
      const env = await parseEnv(
        { _global: { registry: exampleRegistryUrl } },
        false
      );
      should(env).not.be.null();
      registerMissingPackage(packageA);
      const info = await fetchPackageInfo(env!.registry, packageA);
      (info === undefined).should.be.ok();
    });
  });
});
