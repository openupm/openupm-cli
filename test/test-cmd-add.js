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
  captureStream,
  nockUp,
  nockDown
} = require("./utils");

describe("cmd-add.js", function() {
  describe("add", function() {
    let stdout;
    let stderr;
    const pkgInfoRemote = {
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
    const defaultManifest = {
      dependencies: {}
    };
    const expectedManifest = {
      dependencies: {
        "com.example.package-a": "1.0.0"
      },
      scopedRegistries: [
        {
          name: "example.com",
          scopes: ["com.example", "com.example.package-a"],
          url: "http://example.com"
        }
      ]
    };
    beforeEach(function() {
      removeWorkDir("test-openupm-cli");
      createWorkDir("test-openupm-cli", { manifest: true });
      nockUp();
      nock("http://example.com")
        .get("/com.example.package-a")
        .reply(200, pkgInfoRemote, { "Content-Type": "application/json" });
      nock("http://example.com")
        .get("/pkg-not-exist")
        .reply(404);
      stdout = captureStream(process.stdout);
      stderr = captureStream(process.stderr);
    });
    afterEach(function() {
      removeWorkDir("test-openupm-cli");
      nockDown();
      stdout.unhook();
      stderr.unhook();
    });
    it("add pkg", async function() {
      const options = {
        parent: {
          registry: "http://example.com",
          chdir: getWorkDir("test-openupm-cli")
        }
      };
      const retCode = await add("com.example.package-a", options);
      retCode.should.equal(0);
      const manifest = await loadManifest();
      manifest.should.be.deepEqual(expectedManifest);
      stdout
        .captured()
        .includes("added: ")
        .should.be.ok();
      stdout
        .captured()
        .includes("manifest updated")
        .should.be.ok();
    });
    it("add pkg@1.0.0", async function() {
      const options = {
        parent: {
          registry: "http://example.com",
          chdir: getWorkDir("test-openupm-cli")
        }
      };
      const retCode = await add("com.example.package-a@1.0.0", options);
      retCode.should.equal(0);
      const manifest = await loadManifest();
      manifest.should.be.deepEqual(expectedManifest);
      stdout
        .captured()
        .includes("added: ")
        .should.be.ok();
      stdout
        .captured()
        .includes("manifest updated")
        .should.be.ok();
    });
    it("add pkg@latest", async function() {
      const options = {
        parent: {
          registry: "http://example.com",
          chdir: getWorkDir("test-openupm-cli")
        }
      };
      const retCode = await add("com.example.package-a@latest", options);
      retCode.should.equal(0);
      const manifest = await loadManifest();
      manifest.should.be.deepEqual(expectedManifest);
      stdout
        .captured()
        .includes("added: ")
        .should.be.ok();
      stdout
        .captured()
        .includes("manifest updated")
        .should.be.ok();
    });
    it("add pkg@not-exist-version", async function() {
      const options = {
        parent: {
          registry: "http://example.com",
          chdir: getWorkDir("test-openupm-cli")
        }
      };
      const retCode = await add("com.example.package-a@2.0.0", options);
      retCode.should.equal(1);
      const manifest = await loadManifest();
      manifest.should.be.deepEqual(defaultManifest);
      stdout
        .captured()
        .includes("version 2.0.0 is not a valid choice")
        .should.be.ok();
      stdout
        .captured()
        .includes("1.0.0")
        .should.be.ok();
    });
    it("add pkg@http", async function() {
      const options = {
        parent: {
          registry: "http://example.com",
          chdir: getWorkDir("test-openupm-cli")
        }
      };
      const gitUrl = "https://github.com/yo/com.example.package-a";
      const retCode = await add("com.example.package-a@" + gitUrl, options);
      retCode.should.equal(0);
      const manifest = await loadManifest();
      manifest.dependencies["com.example.package-a"].should.be.equal(gitUrl);
      stdout
        .captured()
        .includes("added: ")
        .should.be.ok();
      stdout
        .captured()
        .includes("manifest updated")
        .should.be.ok();
    });
    it("add pkg@git", async function() {
      const options = {
        parent: {
          registry: "http://example.com",
          chdir: getWorkDir("test-openupm-cli")
        }
      };
      const gitUrl = "git@github.com:yo/com.example.package-a";
      const retCode = await add("com.example.package-a@" + gitUrl, options);
      retCode.should.equal(0);
      const manifest = await loadManifest();
      manifest.dependencies["com.example.package-a"].should.be.equal(gitUrl);
      stdout
        .captured()
        .includes("added: ")
        .should.be.ok();
      stdout
        .captured()
        .includes("manifest updated")
        .should.be.ok();
    });
    it("add pkg@file", async function() {
      const options = {
        parent: {
          registry: "http://example.com",
          chdir: getWorkDir("test-openupm-cli")
        }
      };
      const fileUrl = "file../yo/com.example.package-a";
      const retCode = await add("com.example.package-a@" + fileUrl, options);
      retCode.should.equal(0);
      const manifest = await loadManifest();
      manifest.dependencies["com.example.package-a"].should.be.equal(fileUrl);
      stdout
        .captured()
        .includes("added: ")
        .should.be.ok();
      stdout
        .captured()
        .includes("manifest updated")
        .should.be.ok();
    });
    it("add pkg-not-exist", async function() {
      const options = {
        parent: {
          registry: "http://example.com",
          chdir: getWorkDir("test-openupm-cli")
        }
      };
      const retCode = await add("pkg-not-exist", options);
      retCode.should.equal(1);
      const manifest = await loadManifest();
      manifest.should.deepEqual(defaultManifest);
      stderr
        .captured()
        .includes("package not found")
        .should.be.ok();
    });
  });
});
