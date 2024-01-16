import { describe } from "mocha";
import {
  tryCompareEditorVersion,
  tryParseEditorVersion,
} from "../src/types/editor-version";
import "should";
import assert from "assert";
import should from "should";

describe("editor-version", function () {
  describe("parseEditorVersion", function () {
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
        build: 1,
        loc: "c",
        locBuild: 5,
      });
    });
    it("test invalid version", function () {
      (tryParseEditorVersion("2019") === null).should.be.ok();
    });
  });

  describe("compareEditorVersion", function () {
    Array.of<[string, string]>(
      ["2019.1", "2019.1"],
      ["2019.1.1", "2019.1.1"],
      ["2019.1.1f1", "2019.1.1f1"],
      ["2019.1.1f1c1", "2019.1.1f1c1"]
    ).forEach(([a, b]) =>
      it(`${a} == ${b}`, function () {
        should(tryCompareEditorVersion(a, b)).equal(0);
      })
    );
    Array.of<[string, string]>(
      ["2019.2", "2019.1"],
      ["2020.1", "2019.1"]
    ).forEach(([a, b]) =>
      it(`${a} > ${b}`, function () {
        should(tryCompareEditorVersion(a, b)).equal(1);
      })
    );
    Array.of<[string, string]>(
      ["2019.1", "2019.2"],
      ["2019.1", "2020.1"],
      ["2019.1", "2019.1.1"],
      ["2019.1.1", "2019.1.1f1"],
      ["2019.1.1a1", "2020.1.1b1"],
      ["2019.1.1b1", "2020.1.1f1"],
      ["2019.1.1f1", "2020.1.1f1c1"]
    ).forEach(([a, b]) =>
      it(`${a} < ${b}`, function () {
        should(tryCompareEditorVersion(a, b)).equal(-1);
      })
    );

    Array.of<[string, string]>(
      ["2019.1", "not-a-version"],
      ["not-a-version", "2020.1"]
    ).forEach(([a, b]) =>
      it(`should not be able to compare ${a} and ${b}`, function () {
        should(tryCompareEditorVersion(a, b)).be.null();
      })
    );
  });
});
