import "assert";
import nock from "nock";
import "should";
import { search, SearchOptions } from "../src/cmd-search";

import {
  createWorkDir,
  getInspects,
  getOutputs,
  getWorkDir,
  removeWorkDir,
} from "./utils";
import testConsole from "test-console";
import {
  registerSearchResult,
  startMockRegistry,
  stopMockRegistry,
} from "./mock-registry";
import { SearchEndpointResult } from "./types";

describe("cmd-search.ts", function () {
  let stdoutInspect: testConsole.Inspector = null!;
  let stderrInspect: testConsole.Inspector = null!;

  const options: SearchOptions = {
    _global: {
      registry: "http://example.com",
      upstream: false,
      chdir: getWorkDir("test-openupm-cli"),
    },
  };
  getWorkDir("test-openupm-cli");
  beforeEach(function () {
    removeWorkDir("test-openupm-cli");
    createWorkDir("test-openupm-cli", { manifest: true });
    removeWorkDir("test-openupm-cli");
    createWorkDir("test-openupm-cli", { manifest: true });
    [stdoutInspect, stderrInspect] = getInspects();
  });
  afterEach(function () {
    removeWorkDir("test-openupm-cli");
    stdoutInspect.restore();
    stderrInspect.restore();
  });
  describe("search endpoint", function () {
    const searchEndpointResult: SearchEndpointResult = {
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
            maintainers: [{ username: "yo", email: "yo@example.com" }],
          },
          flags: { unstable: true },
          score: {
            final: 0.31065598947261,
            detail: {
              quality: 0.64303646684878,
              popularity: 0.0034858628087645178,
              maintenance: 0.3329285640997383,
            },
          },
          searchScore: 0.000005798558,
        },
      ],
      total: 1,
      time: "Sat Dec 07 2019 04:57:11 GMT+0000 (UTC)",
    };
    const searchEndpointEmptyResult: SearchEndpointResult = {
      objects: [],
      total: 0,
      time: "Sat Dec 07 2019 05:07:42 GMT+0000 (UTC)",
    };
    beforeEach(function () {
      startMockRegistry();
      registerSearchResult("package-a", searchEndpointResult);
      registerSearchResult("pkg-not-exit", searchEndpointEmptyResult);
    });
    afterEach(function () {
      stopMockRegistry();
    });
    it("simple", async function () {
      const retCode = await search("package-a", options);
      retCode.should.equal(0);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("package-a").should.be.ok();
      stdout.includes("1.0.0").should.be.ok();
      stdout.includes("2019-10-02").should.be.ok();
    });
    it("pkg not exist", async function () {
      const retCode = await search("pkg-not-exist", options);
      retCode.should.equal(0);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("No matches found").should.be.ok();
    });
  });

  describe("old search", function () {
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
          url: "git+https://github.com/yo/com.example.package-a.git",
        },
        readmeFilename: "README.md",
        homepage: "https://github.com/yo/com.example.package-a#readme",
        bugs: {
          url: "https://github.com/yo/com.example.package-a/issues",
        },
        license: "MIT",
        time: { modified: "2019-10-02T18:22:51.000Z" },
        versions: { "1.0.0": "latest" },
      },
    };
    beforeEach(function () {
      startMockRegistry();
      nock("http://example.com")
        .persist()
        .get(/-\/v1\/search\?text=/)
        .reply(404);
    });
    afterEach(function () {
      stopMockRegistry();
    });
    it("from remote", async function () {
      nock("http://example.com").get("/-/all").reply(200, allResult, {
        "Content-Type": "application/json",
      });
      const retCode = await search("package-a", options);
      retCode.should.equal(0);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("fast search endpoint is not available").should.be.ok();
      stdout.includes("package-a").should.be.ok();
      stdout.includes("1.0.0").should.be.ok();
      stdout.includes("2019-10-02").should.be.ok();
    });
    it("pkg not exist", async function () {
      nock("http://example.com").get("/-/all").reply(200, allResult, {
        "Content-Type": "application/json",
      });
      const retCode = await search("pkg-not-exist", options);
      retCode.should.equal(0);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("No matches found").should.be.ok();
    });
  });
});
