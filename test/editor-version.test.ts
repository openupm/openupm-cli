import {
  compareEditorVersion,
  tryParseEditorVersion,
} from "../src/types/editor-version";

import assert from "assert";

describe("editor-version", function () {
  describe("parseEditorVersion", function () {
    it("test x.y", function () {
      const version = tryParseEditorVersion("2019.2");
      assert(version !== null);
      expect(version).toEqual({ major: 2019, minor: 2 });
    });
    it("test x.y.z", function () {
      const version = tryParseEditorVersion("2019.2.1");
      assert(version !== null);
      expect(version).toEqual({
        major: 2019,
        minor: 2,
        patch: 1,
      });
    });
    it("test x.y.zan", function () {
      const version = tryParseEditorVersion("2019.2.1a5");
      assert(version !== null);
      expect(version).toEqual({
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
      expect(version).toEqual({
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
      expect(version).toEqual({
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
      expect(version).toEqual({
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
      expect(tryParseEditorVersion("2019") === null).toBeTruthy();
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
        expect(
          compareEditorVersion(
            tryParseEditorVersion(a)!,
            tryParseEditorVersion(b)!
          )
        ).toEqual(0);
      })
    );
    Array.of<[string, string]>(
      ["2019.2", "2019.1"],
      ["2020.1", "2019.1"]
    ).forEach(([a, b]) =>
      it(`${a} > ${b}`, function () {
        expect(
          compareEditorVersion(
            tryParseEditorVersion(a)!,
            tryParseEditorVersion(b)!
          )
        ).toEqual(1);
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
        expect(
          compareEditorVersion(
            tryParseEditorVersion(a)!,
            tryParseEditorVersion(b)!
          )
        ).toEqual(-1);
      })
    );
  });
});
