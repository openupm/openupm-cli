import { describe } from "mocha";
import {
  compareEditorVersion,
  tryParseEditorVersion,
} from "../src/utils/editor-version";
import "should";
import assert from "assert";

describe("editor-version", function () {
  describe("parseEditorVersion", function () {
    it("test null", function () {
      (tryParseEditorVersion(null) === null).should.be.ok();
    });
    it("test x.y", function () {
      const version = tryParseEditorVersion("2019.2");
      assert(version !== null);
      version.should.deepEqual({ major: 2019, minor: 2 });
    });
    it("test x.y.z", function () {
      const version = tryParseEditorVersion("2019.2.1");
      assert(version !== null);
      version.should.deepEqual({
        major: 2019,
        minor: 2,
        patch: 1,
      });
    });
    it("test x.y.zan", function () {
      const version = tryParseEditorVersion("2019.2.1a5");
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
      const version = tryParseEditorVersion("2019.2.1b5");
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
      const version = tryParseEditorVersion("2019.2.1f5");
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
      const version = tryParseEditorVersion("2019.2.1f1c5");
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
      (tryParseEditorVersion("2019") === null).should.be.ok();
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
