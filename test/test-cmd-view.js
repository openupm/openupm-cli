/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const assert = require("assert");
const nock = require("nock");
const should = require("should");
const { parseEnv, loadManifest } = require("../lib/core");
const view = require("../lib/cmd-view");
const {
  getWorkDir,
  createWorkDir,
  removeWorkDir,
  getInspects,
  getOutputs,
  nockUp,
  nockDown
} = require("./utils");

describe("cmd-view.js", function() {
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
      chdir: getWorkDir("test-openupm-cli")
    }
  };
  describe("view", function() {
    let stdoutInspect = null;
    let stderrInspect = null;
    const remotePkgInfoA = {
      name: "com.example.package-a",
      versions: {
        "1.0.0": {
          name: "com.example.package-a",
          displayName: "Package A",
          author: {
            name: "batman"
          },
          version: "1.0.0",
          unity: "2018.4",
          description: "A demo package",
          keywords: [""],
          category: "Unity",
          dependencies: {
            "com.example.package-a": "^1.0.0"
          },
          gitHead: "5c141ecfac59c389090a07540f44c8ac5d07a729",
          readmeFilename: "README.md",
          _id: "com.example.package-a@1.0.0",
          _nodeVersion: "12.13.1",
          _npmVersion: "6.12.1",
          dist: {
            integrity:
              "sha512-MAh44bur7HGyfbCXH9WKfaUNS67aRMfO0VAbLkr+jwseb1hJue/I1pKsC7PKksuBYh4oqoo9Jov1cBcvjVgjmA==",
            shasum: "516957cac4249f95cafab0290335def7d9703db7",
            tarball:
              "https://cdn.example.com/com.example.package-a/com.example.package-a-1.0.0.tgz"
          },
          contributors: []
        }
      },
      time: {
        modified: "2019-11-28T18:51:58.123Z",
        created: "2019-11-28T18:51:58.123Z",
        "1.0.0": "2019-11-28T18:51:58.123Z"
      },
      users: {},
      "dist-tags": {
        latest: "1.0.0"
      },
      _rev: "3-418f950115c32bd0",
      _id: "com.example.package-a",
      readme: "A demo package",
      _attachments: {}
    };
    const remotePkgInfoUp = {
      name: "com.example.package-up",
      versions: {
        "1.0.0": {
          name: "com.example.package-up",
          displayName: "Package A",
          author: {
            name: "batman"
          },
          version: "1.0.0",
          unity: "2018.4",
          description: "A demo package",
          keywords: [""],
          category: "Unity",
          dependencies: {
            "com.example.package-up": "^1.0.0"
          },
          gitHead: "5c141ecfac59c389090a07540f44c8ac5d07a729",
          readmeFilename: "README.md",
          _id: "com.example.package-up@1.0.0",
          _nodeVersion: "12.13.1",
          _npmVersion: "6.12.1",
          dist: {
            integrity:
              "sha512-MAh44bur7HGyfbCXH9WKfaUNS67aRMfO0VAbLkr+jwseb1hJue/I1pKsC7PKksuBYh4oqoo9Jov1cBcvjVgjmA==",
            shasum: "516957cac4249f95cafab0290335def7d9703db7",
            tarball:
              "https://cdn.example.com/com.example.package-up/com.example.package-up-1.0.0.tgz"
          },
          contributors: []
        }
      },
      time: {
        modified: "2019-11-28T18:51:58.123Z",
        created: "2019-11-28T18:51:58.123Z",
        "1.0.0": "2019-11-28T18:51:58.123Z"
      },
      users: {},
      "dist-tags": {
        latest: "1.0.0"
      },
      _rev: "3-418f950115c32bd0",
      _id: "com.example.package-up",
      readme: "A demo package",
      _attachments: {}
    };
    beforeEach(function() {
      removeWorkDir("test-openupm-cli");
      createWorkDir("test-openupm-cli", { manifest: true });
      nockUp();
      nock("http://example.com")
        .get("/com.example.package-a")
        .reply(200, remotePkgInfoA, { "Content-Type": "application/json" });
      nock("http://example.com")
        .get("/pkg-not-exist")
        .reply(404);
      nock("http://example.com")
        .get("/com.example.package-up")
        .reply(404);
      nock("https://packages.unity.com")
        .get("/com.example.package-up")
        .reply(200, remotePkgInfoUp, {
          "Content-Type": "application/json"
        });
      nock("https://packages.unity.com")
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
    it("view pkg", async function() {
      const retCode = await view("com.example.package-a", options);
      retCode.should.equal(0);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("com.example.package-a@1.0.0").should.be.ok();
    });
    it("view pkg@1.0.0", async function() {
      const retCode = await view("com.example.package-a@1.0.0", options);
      retCode.should.equal(1);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("please replace").should.be.ok();
    });
    it("view pkg-not-exist", async function() {
      const retCode = await view("pkg-not-exist", options);
      retCode.should.equal(1);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("package not found").should.be.ok();
    });
    it("view pkg from upstream", async function() {
      const retCode = await view("com.example.package-up", upstreamOptions);
      retCode.should.equal(0);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("com.example.package-up@1.0.0").should.be.ok();
    });
    it("view pkg-not-exist from upstream", async function() {
      const retCode = await view("pkg-not-exist", upstreamOptions);
      retCode.should.equal(1);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("package not found").should.be.ok();
    });
  });
});
