/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const assert = require("assert");
const should = require("should");

const { parseEnv, loadManifest } = require("../lib/core");
const remove = require("../lib/cmd-remove");
const {
  getInspects,
  getOutputs,
  getWorkDir,
  createWorkDir,
  removeWorkDir
} = require("./utils");

describe("cmd-remove.js", function() {
  describe("remove", function() {
    let stdoutInspect = null;
    let stderrInspect = null;
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
      [stdoutInspect, stderrInspect] = getInspects();
    });
    afterEach(function() {
      removeWorkDir("test-openupm-cli");
      stdoutInspect.restore();
      stderrInspect.restore();
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
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("removed ").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
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
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("please replace").should.be.ok();
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
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("package not found").should.be.ok();
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
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("removed com.example.package-a").should.be.ok();
      stdout.includes("removed com.example.package-b").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
  });
});
