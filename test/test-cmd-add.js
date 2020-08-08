/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const assert = require("assert");
const nock = require("nock");
const should = require("should");

const { parseEnv, loadManifest } = require("../lib/core");
const add = require("../lib/cmd-add");
const {
  getWorkDir,
  createWorkDir,
  removeWorkDir,
  getInspects,
  getOutputs,
  nockUp,
  nockDown
} = require("./utils");

describe("cmd-add.js", function() {
  const options = {
    parent: {
      registry: "http://example.com",
      upstream: false,
      chdir: getWorkDir("test-openupm-cli")
    }
  };
  const upstreamOptions = {
    parent: {
      registry: "http://example.com",
      upstream: true,
      chdir: getWorkDir("test-openupm-cli")
    }
  };
  const testableOptions = {
    parent: {
      registry: "http://example.com",
      upstream: false,
      chdir: getWorkDir("test-openupm-cli")
    },
    test: true
  };
  describe("add", function() {
    let stdoutInspect = null;
    let stderrInspect = null;
    const remotePkgInfoA = {
      name: "com.base.package-a",
      versions: {
        "0.1.0": {
          name: "com.base.package-a",
          version: "0.1.0",
          dependencies: {}
        },
        "1.0.0": {
          name: "com.base.package-a",
          version: "1.0.0",
          dependencies: {}
        }
      },
      "dist-tags": {
        latest: "1.0.0"
      }
    };
    const remotePkgInfoB = {
      name: "com.base.package-b",
      versions: {
        "1.0.0": {
          name: "com.base.package-b",
          version: "1.0.0",
          dependencies: {}
        }
      },
      "dist-tags": {
        latest: "1.0.0"
      }
    };
    const remotePkgInfoC = {
      name: "com.base.package-c",
      versions: {
        "1.0.0": {
          name: "com.base.package-c",
          version: "1.0.0",
          dependencies: {
            "com.base.package-d": "1.0.0",
            "com.unity.modules.x": "1.0.0"
          }
        }
      },
      "dist-tags": {
        latest: "1.0.0"
      }
    };
    const remotePkgInfoD = {
      name: "com.base.package-d",
      versions: {
        "1.0.0": {
          name: "com.base.package-d",
          version: "1.0.0",
          dependencies: {
            "com.upstream.package-up": "1.0.0"
          }
        }
      },
      "dist-tags": {
        latest: "1.0.0"
      }
    };
    const remotePkgInfoUp = {
      name: "com.upstream.package-up",
      versions: {
        "1.0.0": {
          name: "com.upstream.package-up",
          version: "1.0.0",
          dependencies: {}
        }
      },
      "dist-tags": {
        latest: "1.0.0"
      }
    };
    const defaultManifest = {
      dependencies: {}
    };
    const expectedManifestA = {
      dependencies: {
        "com.base.package-a": "1.0.0"
      },
      scopedRegistries: [
        {
          name: "example.com",
          scopes: ["com.base.package-a", "com.example"],
          url: "http://example.com"
        }
      ]
    };
    const expectedManifestAB = {
      dependencies: {
        "com.base.package-a": "1.0.0",
        "com.base.package-b": "1.0.0"
      },
      scopedRegistries: [
        {
          name: "example.com",
          scopes: ["com.base.package-a", "com.base.package-b", "com.example"],
          url: "http://example.com"
        }
      ]
    };
    const expectedManifestC = {
      dependencies: {
        "com.base.package-c": "1.0.0"
      },
      scopedRegistries: [
        {
          name: "example.com",
          scopes: ["com.base.package-c", "com.base.package-d", "com.example"],
          url: "http://example.com"
        }
      ]
    };
    const expectedManifestUpstream = {
      dependencies: {
        "com.upstream.package-up": "1.0.0"
      }
    };
    const expectedManifestTestable = {
      dependencies: {
        "com.base.package-a": "1.0.0"
      },
      scopedRegistries: [
        {
          name: "example.com",
          scopes: ["com.base.package-a", "com.example"],
          url: "http://example.com"
        }
      ],
      testables: ["com.base.package-a"]
    };
    beforeEach(function() {
      removeWorkDir("test-openupm-cli");
      createWorkDir("test-openupm-cli", { manifest: true });
      nockUp();
      nock("http://example.com")
        .persist()
        .get("/com.base.package-a")
        .reply(200, remotePkgInfoA, { "Content-Type": "application/json" });
      nock("http://example.com")
        .persist()
        .get("/com.base.package-b")
        .reply(200, remotePkgInfoB, { "Content-Type": "application/json" });
      nock("http://example.com")
        .persist()
        .get("/com.base.package-c")
        .reply(200, remotePkgInfoC, { "Content-Type": "application/json" });
      nock("http://example.com")
        .persist()
        .get("/com.base.package-d")
        .reply(200, remotePkgInfoD, { "Content-Type": "application/json" });
      nock("http://example.com")
        .persist()
        .get("/pkg-not-exist")
        .reply(404);
      nock("http://example.com")
        .persist()
        .get("/com.upstream.package-up")
        .reply(404);
      nock("https://packages.unity.com")
        .persist()
        .get("/com.upstream.package-up")
        .reply(200, remotePkgInfoUp, {
          "Content-Type": "application/json"
        });
      nock("https://packages.unity.com")
        .persist()
        .get("/pkg-not-exist")
        .reply(404);
      [stdoutInspect, stderrInspect] = getInspects();
    });
    afterEach(function() {
      removeWorkDir("test-openupm-cli");
      nockDown();
      stdoutInspect.restore();
      stderrInspect.restore();
    });
    it("add pkg", async function() {
      const retCode = await add("com.base.package-a", options);
      retCode.should.equal(0);
      const manifest = await loadManifest();
      manifest.should.be.deepEqual(expectedManifestA);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg@1.0.0", async function() {
      const retCode = await add("com.base.package-a@1.0.0", options);
      retCode.should.equal(0);
      const manifest = await loadManifest();
      manifest.should.be.deepEqual(expectedManifestA);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg@latest", async function() {
      const retCode = await add("com.base.package-a@latest", options);
      retCode.should.equal(0);
      const manifest = await loadManifest();
      manifest.should.be.deepEqual(expectedManifestA);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg@0.1.0 then pkg@1.0.0", async function() {
      const retCode1 = await add("com.base.package-a@0.1.0", options);
      retCode1.should.equal(0);
      const retCode2 = await add("com.base.package-a@1.0.0", options);
      retCode2.should.equal(0);
      const manifest = await loadManifest();
      manifest.should.be.deepEqual(expectedManifestA);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("modified ").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add exited pkg version", async function() {
      const retCode1 = await add("com.base.package-a@1.0.0", options);
      retCode1.should.equal(0);
      const retCode2 = await add("com.base.package-a@1.0.0", options);
      retCode2.should.equal(0);
      const manifest = await loadManifest();
      manifest.should.be.deepEqual(expectedManifestA);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("existed ").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg@not-exist-version", async function() {
      const retCode = await add("com.base.package-a@2.0.0", options);
      retCode.should.equal(1);
      const manifest = await loadManifest();
      manifest.should.be.deepEqual(defaultManifest);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("version 2.0.0 is not a valid choice").should.be.ok();
      stdout.includes("1.0.0").should.be.ok();
    });
    it("add pkg@http", async function() {
      const gitUrl = "https://github.com/yo/com.base.package-a";
      const retCode = await add("com.base.package-a@" + gitUrl, options);
      retCode.should.equal(0);
      const manifest = await loadManifest();
      manifest.dependencies["com.base.package-a"].should.be.equal(gitUrl);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg@git", async function() {
      const gitUrl = "git@github.com:yo/com.base.package-a";
      const retCode = await add("com.base.package-a@" + gitUrl, options);
      retCode.should.equal(0);
      const manifest = await loadManifest();
      manifest.dependencies["com.base.package-a"].should.be.equal(gitUrl);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg@file", async function() {
      const fileUrl = "file../yo/com.base.package-a";
      const retCode = await add("com.base.package-a@" + fileUrl, options);
      retCode.should.equal(0);
      const manifest = await loadManifest();
      manifest.dependencies["com.base.package-a"].should.be.equal(fileUrl);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg-not-exist", async function() {
      const retCode = await add("pkg-not-exist", options);
      retCode.should.equal(1);
      const manifest = await loadManifest();
      manifest.should.deepEqual(defaultManifest);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("package not found").should.be.ok();
    });
    it("add more than one pkgs", async function() {
      const retCode = await add(
        ["com.base.package-a", "com.base.package-b"],
        options
      );
      retCode.should.equal(0);
      const manifest = await loadManifest();
      manifest.should.be.deepEqual(expectedManifestAB);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added com.base.package-a").should.be.ok();
      stdout.includes("added com.base.package-b").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg from upstream", async function() {
      const retCode = await add("com.upstream.package-up", upstreamOptions);
      retCode.should.equal(0);
      const manifest = await loadManifest();
      manifest.should.be.deepEqual(expectedManifestUpstream);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added com.upstream.package-up").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg-not-exist from upstream", async function() {
      const retCode = await add("pkg-not-exist", upstreamOptions);
      retCode.should.equal(1);
      const manifest = await loadManifest();
      manifest.should.deepEqual(defaultManifest);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("package not found").should.be.ok();
    });
    it("add pkg with nested dependencies", async function() {
      const retCode = await add("com.base.package-c@latest", upstreamOptions);
      retCode.should.equal(0);
      const manifest = await loadManifest();
      manifest.should.be.deepEqual(expectedManifestC);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg with tests", async function() {
      const retCode = await add("com.base.package-a", testableOptions);
      retCode.should.equal(0);
      const manifest = await loadManifest();
      manifest.should.be.deepEqual(expectedManifestTestable);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
  });
});
