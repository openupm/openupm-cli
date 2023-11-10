import "assert";
import "should";
import assert from "assert";
import { parseEnv } from "../src/utils/env";
import { fetchPackageInfo } from "../src/registry-client";
import { PkgInfo } from "../src/types/global";
import {
  registerMissingPackage,
  registerRemotePkg,
  startMockRegistry,
  stopMockRegistry,
} from "./mock-registry";

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
          { _global: { registry: "http://example.com" } },
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
      assert(info !== undefined);
      info.should.deepEqual(pkgInfoRemote);
    });
    it("404", async function () {
      (
        await parseEnv(
          { _global: { registry: "http://example.com" } },
          { checkPath: false }
        )
      ).should.be.ok();

      registerMissingPackage("package-a");
      const info = await fetchPackageInfo("package-a");
      (info === undefined).should.be.ok();
    });
  });
});
