import "assert";
import nock from "nock";
import "should";

import { nockDown, nockUp } from "./utils";
import assert from "assert";
import { parseEnv } from "../src/utils/env";
import { fetchPackageInfo } from "../src/client";

describe("client", function () {
  describe("fetchPackageInfo", function () {
    beforeEach(function () {
      nockUp();
    });
    afterEach(function () {
      nockDown();
    });
    it("simple", async function () {
      (
        await parseEnv(
          { _global: { registry: "http://example.com" } },
          { checkPath: false }
        )
      ).should.be.ok();
      const pkgInfoRemote = { name: "com.littlebigfun.addressable-importer" };
      nock("http://example.com")
        .get("/package-a")
        .reply(200, pkgInfoRemote, { "Content-Type": "application/json" });
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

      nock("http://example.com").get("/package-a").reply(404);
      const info = await fetchPackageInfo("package-a");
      (info === undefined).should.be.ok();
    });
  });
});
