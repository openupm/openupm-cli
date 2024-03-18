import "nock";
import { generateNpmrcLines, getNpmrcPath } from "../src/cmd-login";
import { makeRegistryUrl } from "../src/types/registry-url";
import { runWithEnv } from "./mock-env";
import path from "path";

describe("cmd-login.ts", () => {
  describe("generateNpmrcLines", () => {
    it("should append token to empty content", async function () {
      expect(
        generateNpmrcLines(
          "",
          makeRegistryUrl("http://registry.npmjs.org"),
          "123-456-789"
        )
      ).toEqual(["//registry.npmjs.org/:_authToken=123-456-789"]);
    });
    it("should append token to exist contents", async function () {
      expect(
        generateNpmrcLines(
          "registry=https://registry.npmjs.org/",
          makeRegistryUrl(" registry(http://registry.npmjs.org"),
          "123-456-789"
        )
      ).toEqual([
        "registry=https://registry.npmjs.org/",
        "//registry.npmjs.org/:_authToken=123-456-789",
      ]);
    });
    it("should replace token to exist contents", async function () {
      expect(
        generateNpmrcLines(
          "registry=https://registry.npmjs.org/\n//127.0.0.1:4873/:_authToken=blar-blar-blar\n//registry.npmjs.org/:_authToken=blar-blar-blar",
          makeRegistryUrl("http://registry.npmjs.org"),
          "123-456-789"
        )
      ).toEqual([
        "registry=https://registry.npmjs.org/",
        "//127.0.0.1:4873/:_authToken=blar-blar-blar",
        "//registry.npmjs.org/:_authToken=123-456-789",
      ]);
    });
    it("should handle registry without trailing slash", async function () {
      expect(
        generateNpmrcLines(
          "",
          makeRegistryUrl("http://registry.npmjs.org"),
          "123-456-789"
        )
      ).toEqual(["//registry.npmjs.org/:_authToken=123-456-789"]);
    });
    it("should quote token if necessary", async function () {
      expect(
        generateNpmrcLines(
          "",
          makeRegistryUrl("http://registry.npmjs.org"),
          "=123-456-789="
        )
      ).toEqual(['//registry.npmjs.org/:_authToken="=123-456-789="']);
      expect(
        generateNpmrcLines(
          "",
          makeRegistryUrl("http://registry.npmjs.org"),
          "?123-456-789?"
        )
      ).toEqual(['//registry.npmjs.org/:_authToken="?123-456-789?"']);
    });
  });

  describe("getNpmrcPath", () => {
    it("should be USERPROFILE if defined", function () {
      const actual = runWithEnv({ USERPROFILE: "/user/dir" }, getNpmrcPath);
      const expected = path.join(path.sep, "user", "dir", ".npmrc");
      expect(actual).toEqual(expected);
    });
    it("should be HOME if USERPROFILE is not defined", function () {
      const actual = runWithEnv({ HOME: "/user/dir" }, getNpmrcPath);
      const expected = path.join(path.sep, "user", "dir", ".npmrc");
      expect(actual).toEqual(expected);
    });
    it("should fail if HOME and USERPROFILE are not defined", function () {
      expect(() => runWithEnv({}, getNpmrcPath)).toThrow();
    });
  });
});
