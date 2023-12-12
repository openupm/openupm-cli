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
      (
        await parseEnv(
          { _global: { registry: exampleRegistryUrl } },
          { checkPath: false }
        )
      ).should.be.ok();
      const pkgInfoRemote = buildPackageInfo(packageA);
      registerRemotePkg(pkgInfoRemote);
      const info = await fetchPackageInfo(packageA);
      should(info).deepEqual(pkgInfoRemote);
    });
    it("404", async function () {
      (
        await parseEnv(
          { _global: { registry: exampleRegistryUrl } },
          { checkPath: false }
        )
      ).should.be.ok();

      registerMissingPackage(packageA);
      const info = await fetchPackageInfo(packageA);
      (info === undefined).should.be.ok();
    });
  });
});
