/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const assert = require("assert");
const nock = require("nock");
const should = require("should");
const search = require("../lib/cmd-search");
const { cleanCache } = require("../lib/core");
const {
  getWorkDir,
  createWorkDir,
  removeWorkDir,
  captureStream,
  nockUp,
  nockDown
} = require("./utils");

describe("cmd-search.js", function() {
  let stdout;
  let stderr;
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
  beforeEach(function() {
    cleanCache();
    removeWorkDir("test-openupm-cli");
    createWorkDir("test-openupm-cli", { manifest: true });
    removeWorkDir("test-openupm-cli");
    createWorkDir("test-openupm-cli", { manifest: true });
    stdout = captureStream(process.stdout);
    stderr = captureStream(process.stderr);
  });
  afterEach(function() {
    cleanCache();
    removeWorkDir("test-openupm-cli");
    stdout.unhook();
    stderr.unhook();
  });
  describe("search endpoint", function() {
    const searchEndpointResult = {
      objects: [
        {
          package: {
            name: "com.example.package-a",
            scope: "unscoped",
            version: "1.0.0",
            description: "A demo package",
            date: "2019-10-02T04:02:38.335Z",
            links: {},
            author: { name: "yo", url: "https://github.com/yo" },
            publisher: { username: "yo", email: "yo@example.com" },
            maintainers: [{ username: "yo", email: "yo@example.com" }]
          },
          flags: { unstable: true },
          score: {
            final: 0.31065598947261,
            detail: {
              quality: 0.64303646684878,
              popularity: 0.0034858628087645178,
              maintenance: 0.3329285640997383
            }
          },
          searchScore: 0.000005798558
        }
      ],
      total: 1,
      time: "Sat Dec 07 2019 04:57:11 GMT+0000 (UTC)"
    };
    const searchEndpointUpstreamResult = {
      objects: [
        {
          package: {
            name: "com.example.package-up",
            scope: "unscoped",
            version: "1.0.0",
            description: "A demo package",
            date: "2019-10-02T04:02:38.335Z",
            links: {},
            author: { name: "yo", url: "https://github.com/yo" },
            publisher: { username: "yo", email: "yo@example.com" },
            maintainers: [{ username: "yo", email: "yo@example.com" }]
          },
          flags: { unstable: true },
          score: {
            final: 0.31065598947261,
            detail: {
              quality: 0.64303646684878,
              popularity: 0.0034858628087645178,
              maintenance: 0.3329285640997383
            }
          },
          searchScore: 0.000005798558
        }
      ],
      total: 1,
      time: "Sat Dec 07 2019 04:57:11 GMT+0000 (UTC)"
    };
    const searchEndpointEmptyResult = {
      objects: [],
      total: 0,
      time: "Sat Dec 07 2019 05:07:42 GMT+0000 (UTC)"
    };
    beforeEach(function() {
      nockUp();
      nock("http://example.com")
        .get(/-\/v1\/search\?text=package-a/)
        .reply(200, searchEndpointResult, {
          "Content-Type": "application/json"
        });
      nock("http://example.com")
        .get(/-\/v1\/search\?text=pkg-not-exist/)
        .reply(200, searchEndpointEmptyResult, {
          "Content-Type": "application/json"
        });
      nock("https://api.bintray.com")
        .get(/npm\/unity\/unity\/-\/v1\/search/)
        .reply(200, searchEndpointUpstreamResult, {
          "Content-Type": "application/json"
        });
    });
    afterEach(function() {
      nockDown();
    });
    it("simple", async function() {
      const retCode = await search("package-a", options);
      retCode.should.equal(0);
      stdout
        .captured()
        .includes("package-a")
        .should.be.ok();
      stdout
        .captured()
        .includes("1.0.0")
        .should.be.ok();
      stdout
        .captured()
        .includes("yo")
        .should.be.ok();
      stdout
        .captured()
        .includes("2019-10-02")
        .should.be.ok();
    });
    it("pkg not exist", async function() {
      const retCode = await search("pkg-not-exist", options);
      retCode.should.equal(0);
      stdout
        .captured()
        .includes("No matches found")
        .should.be.ok();
    });
    it("upstream", async function() {
      const retCode = await search("package-a", upstreamOptions);
      retCode.should.equal(0);
      stdout
        .captured()
        .includes("package-up")
        .should.be.ok();
      stdout
        .captured()
        .includes("1.0.0")
        .should.be.ok();
      stdout
        .captured()
        .includes("yo")
        .should.be.ok();
      stdout
        .captured()
        .includes("2019-10-02")
        .should.be.ok();
    });
  });

  describe("old search", function() {
    const allResult = {
      _updated: 99999,
      "com.example.package-a": {
        name: "com.example.package-a",
        description: "A demo package",
        "dist-tags": { latest: "1.0.0" },
        maintainers: [{ name: "yo", email: "yo@example.com" }],
        author: { name: "yo", url: "https://github.com/yo" },
        repository: {
          type: "git",
          url: "git+https://github.com/yo/com.example.package-a.git"
        },
        readmeFilename: "README.md",
        homepage: "https://github.com/yo/com.example.package-a#readme",
        bugs: {
          url: "https://github.com/yo/com.example.package-a/issues"
        },
        license: "MIT",
        time: { modified: "2019-10-02T18:22:51.000Z" },
        versions: { "1.0.0": "latest" }
      }
    };
    const allResultSince = [
      {
        name: "com.example.package-b",
        description: "A demo package",
        "dist-tags": { latest: "2.0.0" },
        maintainers: [{ name: "yo1", email: "yo1@example.com" }],
        author: { name: "yo1", url: "https://github.com/yo1" },
        repository: {
          type: "git",
          url: "git+https://github.com/yo/com.example.package-b.git"
        },
        readmeFilename: "README.md",
        homepage: "https://github.com/yo/com.example.package-b#readme",
        bugs: {
          url: "https://github.com/yo/com.example.package-b/issues"
        },
        license: "MIT",
        time: { modified: "2019-10-03T18:22:51.000Z" },
        versions: { "2.0.0": "latest" }
      }
    ];
    const allEmptyResult = {
      _updated: 99999
    };
    beforeEach(function() {
      nockUp();
      nock("http://example.com")
        .persist()
        .get(/-\/v1\/search\?text=/)
        .reply(404);
    });
    afterEach(function() {
      nockDown();
    });
    it("from remote", async function() {
      nock("http://example.com")
        .get("/-/all")
        .reply(200, allResult, {
          "Content-Type": "application/json"
        });
      const retCode = await search("package-a", options);
      retCode.should.equal(0);
      stderr
        .captured()
        .includes("fast search endpoint is not available")
        .should.be.ok();
      stdout
        .captured()
        .includes("package-a")
        .should.be.ok();
      stdout
        .captured()
        .includes("1.0.0")
        .should.be.ok();
      stdout
        .captured()
        .includes("yo")
        .should.be.ok();
      stdout
        .captured()
        .includes("2019-10-02")
        .should.be.ok();
    });
    it("from cache", async function() {
      nock("http://example.com")
        .get("/-/all")
        .reply(200, allResult, {
          "Content-Type": "application/json"
        });
      let retCode = await search("package-a", options);
      retCode.should.equal(0);
      stderr
        .captured()
        .includes("fast search endpoint is not available")
        .should.be.ok();
      stdout
        .captured()
        .includes("package-a")
        .should.be.ok();
      stdout
        .captured()
        .includes("1.0.0")
        .should.be.ok();
      stdout
        .captured()
        .includes("yo")
        .should.be.ok();
      stdout
        .captured()
        .includes("2019-10-02")
        .should.be.ok();
      nock("http://example.com")
        .get(/\/-\/all\/since/)
        .reply(200, [], {
          "Content-Type": "application/json"
        });
      retCode = await search("package-a", options);
      retCode.should.equal(0);
      stderr
        .captured()
        .includes("fast search endpoint is not available")
        .should.be.ok();
      stdout
        .captured()
        .includes("package-a")
        .should.be.ok();
      stdout
        .captured()
        .includes("1.0.0")
        .should.be.ok();
      stdout
        .captured()
        .includes("yo")
        .should.be.ok();
      stdout
        .captured()
        .includes("2019-10-02")
        .should.be.ok();
    });
    it("from cache and remote", async function() {
      nock("http://example.com")
        .get("/-/all")
        .reply(200, allResult, {
          "Content-Type": "application/json"
        });
      let retCode = await search("package-a", options);
      retCode.should.equal(0);
      stderr
        .captured()
        .includes("fast search endpoint is not available")
        .should.be.ok();
      stdout
        .captured()
        .includes("package-a")
        .should.be.ok();
      stdout
        .captured()
        .includes("1.0.0")
        .should.be.ok();
      stdout
        .captured()
        .includes("yo")
        .should.be.ok();
      stdout
        .captured()
        .includes("2019-10-02")
        .should.be.ok();
      nock("http://example.com")
        .get(/\/-\/all\/since/)
        .reply(200, allResultSince, {
          "Content-Type": "application/json"
        });
      retCode = await search("package", options);
      retCode.should.equal(0);
      stderr
        .captured()
        .includes("fast search endpoint is not available")
        .should.be.ok();
      stdout
        .captured()
        .includes("package-a")
        .should.be.ok();
      stdout
        .captured()
        .includes("1.0.0")
        .should.be.ok();
      stdout
        .captured()
        .includes("yo")
        .should.be.ok();
      stdout
        .captured()
        .includes("2019-10-02")
        .should.be.ok();
      stdout
        .captured()
        .includes("package-b")
        .should.be.ok();
      stdout
        .captured()
        .includes("2.0.0")
        .should.be.ok();
      stdout
        .captured()
        .includes("yo1")
        .should.be.ok();
      stdout
        .captured()
        .includes("2019-10-03")
        .should.be.ok();
    });
    it("pkg not exist", async function() {
      nock("http://example.com")
        .get("/-/all")
        .reply(200, allResult, {
          "Content-Type": "application/json"
        });
      const retCode = await search("pkg-not-exist", options);
      retCode.should.equal(0);
      stdout
        .captured()
        .includes("No matches found")
        .should.be.ok();
    });
  });
});
