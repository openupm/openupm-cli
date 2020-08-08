/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const assert = require("assert");
const nock = require("nock");
const should = require("should");
const {
  validateRegistry,
  generateNpmrcLines,
  getNpmrcPath
} = require("../lib/cmd-login");

describe("cmd-login.js", function() {
  describe("validateRegistry", function() {
    it("should validate http", async function() {
      validateRegistry("http://registry.npmjs.org/").should.be.ok();
    });
    it("should validate https", async function() {
      validateRegistry("https://registry.npmjs.org/").should.be.ok();
    });
    it("should reject without http protocal", async function() {
      should(function() {
        validateRegistry("registry.npmjs.org/");
      }).throw("The registry address should starts with http(s)://");
    });
  });

  describe("generateNpmrcLines", function() {
    it("should append token to empty content", async function() {
      generateNpmrcLines(
        "",
        "http://registry.npmjs.org/",
        "123-456-789"
      ).should.deepEqual(["//registry.npmjs.org/:_authToken=123-456-789"]);
    });
    it("should append token to exist contents", async function() {
      generateNpmrcLines(
        "registry=https://registry.npmjs.org/",
        "http://registry.npmjs.org/",
        "123-456-789"
      ).should.deepEqual([
        "registry=https://registry.npmjs.org/",
        "//registry.npmjs.org/:_authToken=123-456-789"
      ]);
    });
    it("should replace token to exist contents", async function() {
      generateNpmrcLines(
        "registry=https://registry.npmjs.org/\n//127.0.0.1:4873/:_authToken=blar-blar-blar\n//registry.npmjs.org/:_authToken=blar-blar-blar",
        "http://registry.npmjs.org/",
        "123-456-789"
      ).should.deepEqual([
        "registry=https://registry.npmjs.org/",
        "//127.0.0.1:4873/:_authToken=blar-blar-blar",
        "//registry.npmjs.org/:_authToken=123-456-789"
      ]);
    });
    it("should handle registry without trailing slash", async function() {
      generateNpmrcLines(
        "",
        "http://registry.npmjs.org",
        "123-456-789"
      ).should.deepEqual(["//registry.npmjs.org/:_authToken=123-456-789"]);
    });
    it("should quote token if necessary", async function() {
      generateNpmrcLines(
        "",
        "http://registry.npmjs.org/",
        "=123-456-789="
      ).should.deepEqual(['//registry.npmjs.org/:_authToken="=123-456-789="']);
      generateNpmrcLines(
        "",
        "http://registry.npmjs.org/",
        "?123-456-789?"
      ).should.deepEqual(['//registry.npmjs.org/:_authToken="?123-456-789?"']);
    });
  });

  describe("getNpmrcPath", function() {
    it("should includes .npmrc", async function() {
      getNpmrcPath()
        .includes(".npmrc")
        .should.be.ok();
    });
  });
});
