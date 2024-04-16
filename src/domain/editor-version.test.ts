import {
  compareEditorVersion,
  tryParseEditorVersion,
} from "./editor-version";

import assert from "assert";

describe("editor-version", () => {
  describe("parseEditorVersion", () => {
    it("should parse x.y", () => {
      const version = tryParseEditorVersion("2019.2");
      assert(version !== null);
      expect(version).toEqual({ major: 2019, minor: 2 });
    });
    it("should parse x.y.z", () => {
      const version = tryParseEditorVersion("2019.2.1");
      assert(version !== null);
      expect(version).toEqual({
        major: 2019,
        minor: 2,
        patch: 1,
      });
    });
    it("should parse x.y.zan", () => {
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
    it("should parse x.y.zbn", () => {
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
    it("should parse x.y.zfn", () => {
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
    it("should parse x.y.zcn", () => {
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
    it("should not parse invalid version", () => {
      expect(tryParseEditorVersion("2019") === null).toBeTruthy();
    });
  });

  describe("compareEditorVersion", () => {
    it.each([
      ["2019.1", "2019.1"],
      ["2019.1.1", "2019.1.1"],
      ["2019.1.1f1", "2019.1.1f1"],
      ["2019.1.1f1c1", "2019.1.1f1c1"],
    ])(`should be equal %s and %s`, function (a, b) {
      expect(
        compareEditorVersion(
          tryParseEditorVersion(a)!,
          tryParseEditorVersion(b)!
        )
      ).toEqual(0);
    });

    it.each([
      ["2019.2", "2019.1"],
      ["2020.1", "2019.1"],
    ])(`should be greater for %s and %s`, function (a, b) {
      expect(
        compareEditorVersion(
          tryParseEditorVersion(a)!,
          tryParseEditorVersion(b)!
        )
      ).toEqual(1);
    });

    it.each([
      ["2019.1", "2019.2"],
      ["2019.1", "2020.1"],
      ["2019.1", "2019.1.1"],
      ["2019.1.1", "2019.1.1f1"],
      ["2019.1.1a1", "2020.1.1b1"],
      ["2019.1.1b1", "2020.1.1f1"],
      ["2019.1.1f1", "2020.1.1f1c1"],
    ])(`should be less for %s and %s`, function (a, b) {
      expect(
        compareEditorVersion(
          tryParseEditorVersion(a)!,
          tryParseEditorVersion(b)!
        )
      ).toEqual(-1);
    });
  });
});
