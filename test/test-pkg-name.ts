import "assert";
import "should";
import { splitPkgName } from "../src/utils/pkg-name";
import { PkgName } from "../src/types/global";

describe("pkg-name.ts", function () {
  describe("splitPkgName", function () {
    it("pkg@version", function () {
      splitPkgName("pkg@1.0.0" as PkgName).should.deepEqual({
        name: "pkg",
        version: "1.0.0",
      });
    });
    it("pkg@latest", function () {
      splitPkgName("pkg@latest" as PkgName).should.deepEqual({
        name: "pkg",
        version: "latest",
      });
    });
    it("pkg", function () {
      splitPkgName("pkg" as PkgName).should.deepEqual({
        name: "pkg",
        version: undefined,
      });
    });
    it("pkg@file", function () {
      splitPkgName("pkg@file:../pkg" as PkgName).should.deepEqual({
        name: "pkg",
        version: "file:../pkg",
      });
    });
    it("pkg@http", function () {
      splitPkgName(
        "pkg@https://github.com/owner/pkg" as PkgName
      ).should.deepEqual({
        name: "pkg",
        version: "https://github.com/owner/pkg",
      });
    });
    it("pkg@git", function () {
      splitPkgName(
        "pkg@git@github.com:owner/pkg.git" as PkgName
      ).should.deepEqual({
        name: "pkg",
        version: "git@github.com:owner/pkg.git",
      });
    });
  });
});
