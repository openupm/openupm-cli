import nock from "nock";
import "should";
import { search, SearchOptions } from "../src/cmd-search";
import {
  exampleRegistryUrl,
  registerSearchResult,
  startMockRegistry,
  stopMockRegistry,
} from "./mock-registry";
import { SearchEndpointResult } from "./types";
import { attachMockConsole, MockConsole } from "./mock-console";
import { domainName } from "../src/types/domain-name";
import { semanticVersion } from "../src/types/semantic-version";
import { MockUnityProject, setupUnityProject } from "./setup/unity-project";

describe("cmd-search.ts", function () {
  let mockConsole: MockConsole = null!;
  let mockProject: MockUnityProject = null!;

  const options: SearchOptions = {
    _global: {
      registry: exampleRegistryUrl,
      upstream: false,
    },
  };

  beforeAll(async function () {
    mockProject = await setupUnityProject({});
  });

  beforeEach(function () {
    mockConsole = attachMockConsole();
  });

  afterEach(async function () {
    await mockProject.reset();
    mockConsole.detach();
  });

  afterAll(async function () {
    await mockProject.restore();
  });

  describe("search endpoint", function () {
    const searchEndpointResult: SearchEndpointResult = {
      objects: [
        {
          package: {
            name: domainName("com.example.package-a"),
            scope: "unscoped",
            version: semanticVersion("1.0.0"),
            description: "A demo package",
            date: "2019-10-02T04:02:38.335Z",
            links: {},
            author: { name: "yo", url: "https://github.com/yo" },
            publisher: { name: "yo", email: "yo@example.com" },
            maintainers: [{ name: "yo", email: "yo@example.com" }],
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
      mockConsole.hasLineIncluding("out", "package-a").should.be.ok();
      mockConsole.hasLineIncluding("out", "1.0.0").should.be.ok();
      mockConsole.hasLineIncluding("out", "2019-10-02").should.be.ok();
    });
    it("pkg not exist", async function () {
      const retCode = await search("pkg-not-exist", options);
      retCode.should.equal(0);
      mockConsole.hasLineIncluding("out", "No matches found").should.be.ok();
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
      nock(exampleRegistryUrl)
        .persist()
        .get(/-\/v1\/search\?text=/)
        .reply(404);
    });
    afterEach(function () {
      stopMockRegistry();
    });
    it("from remote", async function () {
      nock(exampleRegistryUrl).get("/-/all").reply(200, allResult, {
        "Content-Type": "application/json",
      });
      const retCode = await search("package-a", options);
      retCode.should.equal(0);
      mockConsole
        .hasLineIncluding("out", "fast search endpoint is not available")
        .should.be.ok();
      mockConsole.hasLineIncluding("out", "package-a").should.be.ok();
      mockConsole.hasLineIncluding("out", "1.0.0").should.be.ok();
      mockConsole.hasLineIncluding("out", "2019-10-02").should.be.ok();
    });
    it("pkg not exist", async function () {
      nock(exampleRegistryUrl).get("/-/all").reply(200, allResult, {
        "Content-Type": "application/json",
      });
      const retCode = await search("pkg-not-exist", options);
      retCode.should.equal(0);
      mockConsole.hasLineIncluding("out", "No matches found").should.be.ok();
    });
  });
});
