/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const assert = require("assert");
const should = require("should");
const { parseEnv, loadManifest } = require("../lib/core");
const remove = require("../lib/cmd-remove");
const {
  getWorkDir,
  createWorkDir,
  removeWorkDir,
  captureStream
} = require("./utils");

describe("cmd-remove.js", function() {
  describe("remove", function() {
    let stdout;
    let stderr;
    const defaultManifest = {
      dependencies: {
        "com.example.package-a": "1.0.0",
        "com.example.package-b": "1.0.0"
      },
      scopedRegistries: [
        {
          name: "example.com",
          scopes: [
            "com.example",
            "com.example.package-a",
            "com.example.package-b"
          ],
          url: "http://example.com"
        }
      ]
    };
    beforeEach(function() {
      removeWorkDir("test-openupm-cli");
      createWorkDir("test-openupm-cli", {
        manifest: defaultManifest
      });
      stdout = captureStream(process.stdout);
      stderr = captureStream(process.stderr);
    });
    afterEach(function() {
      removeWorkDir("test-openupm-cli");
      stdout.unhook();
      stderr.unhook();
    });
    it("remove pkg", async function() {
      const options = {
        parent: {
          registry: "http://example.com",
          chdir: getWorkDir("test-openupm-cli")
        }
      };
      const retCode = await remove("com.example.package-a", options);
      retCode.should.equal(0);
      const manifest = await loadManifest();
      (
        manifest.dependencies["com.example.package-a"] == undefined
      ).should.be.ok();
      manifest.scopedRegistries[0].scopes.should.be.deepEqual([
        "com.example",
        "com.example.package-b"
      ]);
      stdout
        .captured()
        .includes("removed: ")
        .should.be.ok();
      stdout
        .captured()
        .includes("manifest updated")
        .should.be.ok();
    });
    it("remove pkg@1.0.0", async function() {
      const options = {
        parent: {
          registry: "http://example.com",
          chdir: getWorkDir("test-openupm-cli")
        }
      };
      const retCode = await remove("com.example.package-a@1.0.0", options);
      retCode.should.equal(1);
      const manifest = await loadManifest();
      manifest.should.be.deepEqual(defaultManifest);
      stderr
        .captured()
        .includes("remove command doesn't support name@version")
        .should.be.ok();
    });
    it("remove pkg-not-exist", async function() {
      const options = {
        parent: {
          registry: "http://example.com",
          chdir: getWorkDir("test-openupm-cli")
        }
      };
      const retCode = await remove("pkg-not-exist", options);
      retCode.should.equal(1);
      const manifest = await loadManifest();
      manifest.should.be.deepEqual(defaultManifest);
      stderr
        .captured()
        .includes("package not found")
        .should.be.ok();
    });
    it("remove more than one pkgs", async function() {
      const options = {
        parent: {
          registry: "http://example.com",
          chdir: getWorkDir("test-openupm-cli")
        }
      };
      const retCode = await remove(
        ["com.example.package-a", "com.example.package-b"],
        options
      );
      retCode.should.equal(0);
      const manifest = await loadManifest();
      (
        manifest.dependencies["com.example.package-a"] == undefined
      ).should.be.ok();
      (
        manifest.dependencies["com.example.package-b"] == undefined
      ).should.be.ok();
      manifest.scopedRegistries[0].scopes.should.be.deepEqual(["com.example"]);
      stdout
        .captured()
        .includes("removed: com.example.package-a")
        .should.be.ok();
      stdout
        .captured()
        .includes("removed: com.example.package-b")
        .should.be.ok();
      stdout
        .captured()
        .includes("manifest updated")
        .should.be.ok();
    });
  });
});
