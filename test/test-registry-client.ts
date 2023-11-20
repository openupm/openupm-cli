import "assert";
import "should";
import { parseEnv } from "../src/utils/env";
import { fetchPackageInfo } from "../src/registry-client";
import { PkgInfo } from "../src/types/global";
import {
  exampleRegistryUrl,
  registerMissingPackage,
  registerRemotePkg,
  startMockRegistry,
  stopMockRegistry,
} from "./mock-registry";
import should from "should";

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
      const pkgInfoRemote: PkgInfo = {
        name: "package-a",
        versions: {},
        time: {},
      };
      registerRemotePkg(pkgInfoRemote);
      const info = await fetchPackageInfo("package-a");
      should(info).deepEqual(pkgInfoRemote);
    });
    it("404", async function () {
      (
        await parseEnv(
          { _global: { registry: exampleRegistryUrl } },
          { checkPath: false }
        )
      ).should.be.ok();

      registerMissingPackage("package-a");
      const info = await fetchPackageInfo("package-a");
      (info === undefined).should.be.ok();
    });
  });
});
