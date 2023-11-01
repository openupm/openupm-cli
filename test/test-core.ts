import "assert";
import nock from "nock";
import "should";
import {
  compareEditorVersion,
  fetchPackageInfo,
  parseEditorVersion,
} from "../src/core";

import { nockDown, nockUp } from "./utils";
import assert from "assert";
import { parseEnv } from "../src/utils/env";

describe("cmd-core.ts", function () {
 

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

  describe("parseEditorVersion", function () {
    it("test null", function () {
      (parseEditorVersion(null) === null).should.be.ok();
    });
    it("test x.y", function () {
      const version = parseEditorVersion("2019.2");
      assert(version !== null);
      version.should.deepEqual({ major: 2019, minor: 2 });
    });
    it("test x.y.z", function () {
      const version = parseEditorVersion("2019.2.1");
      assert(version !== null);
      version.should.deepEqual({
        major: 2019,
        minor: 2,
        patch: 1,
      });
    });
    it("test x.y.zan", function () {
      const version = parseEditorVersion("2019.2.1a5");
      assert(version !== null);
      version.should.deepEqual({
        major: 2019,
        minor: 2,
        patch: 1,
        flag: "a",
        flagValue: 0,
        build: 5,
      });
    });
    it("test x.y.zbn", function () {
      const version = parseEditorVersion("2019.2.1b5");
      assert(version !== null);
      version.should.deepEqual({
        major: 2019,
        minor: 2,
        patch: 1,
        flag: "b",
        flagValue: 1,
        build: 5,
      });
    });
    it("test x.y.zfn", function () {
      const version = parseEditorVersion("2019.2.1f5");
      assert(version !== null);
      version.should.deepEqual({
        major: 2019,
        minor: 2,
        patch: 1,
        flag: "f",
        flagValue: 2,
        build: 5,
      });
    });
    it("test x.y.zcn", function () {
      const version = parseEditorVersion("2019.2.1f1c5");
      assert(version !== null);
      version.should.deepEqual({
        major: 2019,
        minor: 2,
        patch: 1,
        flag: "f",
        flagValue: 2,
        build: 1,
        loc: "c",
        locValue: 1,
        locBuild: 5,
      });
    });
    it("test invalid version", function () {
      (parseEditorVersion("2019") === null).should.be.ok();
    });
  });

  describe("compareEditorVersion", function () {
    it("test 2019.1 == 2019.1", function () {
      compareEditorVersion("2019.1", "2019.1").should.equal(0);
    });
    it("test 2019.1.1 == 2019.1.1", function () {
      compareEditorVersion("2019.1.1", "2019.1.1").should.equal(0);
    });
    it("test 2019.1.1f1 == 2019.1.1f1", function () {
      compareEditorVersion("2019.1.1f1", "2019.1.1f1").should.equal(0);
    });
    it("test 2019.1.1f1c1 == 2019.1.1f1c1", function () {
      compareEditorVersion("2019.1.1f1c1", "2019.1.1f1c1").should.equal(0);
    });
    it("test 2019.2 > 2019.1", function () {
      compareEditorVersion("2019.2", "2019.1").should.equal(1);
    });
    it("test 2020.2 > 2019.1", function () {
      compareEditorVersion("2020.1", "2019.1").should.equal(1);
    });
    it("test 2019.1 < 2019.2", function () {
      compareEditorVersion("2019.1", "2019.2").should.equal(-1);
    });
    it("test 2019.1 < 2020.1", function () {
      compareEditorVersion("2019.1", "2020.1").should.equal(-1);
    });
    it("test 2019.1 < 2019.1.1", function () {
      compareEditorVersion("2019.1", "2019.1.1").should.equal(-1);
    });
    it("test 2019.1.1 < 2019.1.1f1", function () {
      compareEditorVersion("2019.1.1", "2019.1.1f1").should.equal(-1);
    });
    it("test 2019.1.1a1 < 2020.1.1b1", function () {
      compareEditorVersion("2019.1.1a1", "2020.1.1b1").should.equal(-1);
    });
    it("test 2019.1.1b1 < 2020.1.1f1", function () {
      compareEditorVersion("2019.1.1b1", "2020.1.1f1").should.equal(-1);
    });
    it("test 2019.1.1f1 < 2020.1.1f1c1", function () {
      compareEditorVersion("2019.1.1f1", "2020.1.1f1c1").should.equal(-1);
    });
  });
});
