import "nock";
import { generateNpmrcLines, getNpmrcPath } from "../src/cmd-login";
import { registryUrl } from "../src/types/registry-url";
import { runWithEnv } from "./mock-env";
import should from "should";

describe("cmd-login.ts", function () {
  describe("generateNpmrcLines", function () {
    it("should append token to empty content", async function () {
      generateNpmrcLines(
        "",
        registryUrl("http://registry.npmjs.org/"),
        "123-456-789"
      ).should.deepEqual(["//registry.npmjs.org/:_authToken=123-456-789"]);
    });
    it("should append token to exist contents", async function () {
      generateNpmrcLines(
        "registry=https://registry.npmjs.org/",
        registryUrl(" registry(http://registry.npmjs.org/"),
        "123-456-789"
      ).should.deepEqual([
        "registry=https://registry.npmjs.org/",
        "//registry.npmjs.org/:_authToken=123-456-789",
      ]);
    });
    it("should replace token to exist contents", async function () {
      generateNpmrcLines(
        "registry=https://registry.npmjs.org/\n//127.0.0.1:4873/:_authToken=blar-blar-blar\n//registry.npmjs.org/:_authToken=blar-blar-blar",
        registryUrl("http://registry.npmjs.org/"),
        "123-456-789"
      ).should.deepEqual([
        "registry=https://registry.npmjs.org/",
        "//127.0.0.1:4873/:_authToken=blar-blar-blar",
        "//registry.npmjs.org/:_authToken=123-456-789",
      ]);
    });
    it("should handle registry without trailing slash", async function () {
      generateNpmrcLines(
        "",
        registryUrl("http://registry.npmjs.org"),
        "123-456-789"
      ).should.deepEqual(["//registry.npmjs.org/:_authToken=123-456-789"]);
    });
    it("should quote token if necessary", async function () {
      generateNpmrcLines(
        "",
        registryUrl("http://registry.npmjs.org/"),
        "=123-456-789="
      ).should.deepEqual(['//registry.npmjs.org/:_authToken="=123-456-789="']);
      generateNpmrcLines(
        "",
        registryUrl("http://registry.npmjs.org/"),
        "?123-456-789?"
      ).should.deepEqual(['//registry.npmjs.org/:_authToken="?123-456-789?"']);
    });
  });

  describe("getNpmrcPath", function () {
    it("should be USERPROFILE if defined", function () {
      const path = runWithEnv({ USERPROFILE: "/user/dir" }, getNpmrcPath);
      should(path).be.equal("/user/dir/.npmrc");
    });
    it("should be HOME if USERPROFILE is not defined", function () {
      const path = runWithEnv({ HOME: "/user/dir" }, getNpmrcPath);
      should(path).be.equal("/user/dir/.npmrc");
    });
    it("should fail if HOME and USERPROFILE are not defined", function () {
      should(() => runWithEnv({}, getNpmrcPath)).throw();
    });
  });
});
