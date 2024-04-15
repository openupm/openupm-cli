import nock from "nock";
import { search, SearchOptions } from "../src/cli/cmd-search";
import {
  exampleRegistryUrl,
  registerSearchResult,
  startMockRegistry,
  stopMockRegistry,
} from "./mock-registry";
import { SearchEndpointResult } from "./types";
import { makeDomainName } from "../src/domain/domain-name";
import { makeSemanticVersion } from "../src/domain/semantic-version";
import { MockUnityProject, setupUnityProject } from "./setup/unity-project";
import { spyOnLog } from "./log.mock";
import { mockUpmConfig } from "./upm-config-io.mock";
import { mockProjectVersion } from "./project-version-io.mock";

describe("cmd-search", () => {
  let mockProject: MockUnityProject = null!;

  const options: SearchOptions = {
    _global: {
      registry: exampleRegistryUrl,
      upstream: false,
    },
  };

  beforeEach(() => {
    mockUpmConfig(null);
    mockProjectVersion("2020.2.1f1");
  });

  beforeAll(async () => {
    mockProject = await setupUnityProject({});
  });

  afterEach(async () => {
    await mockProject.reset();
  });

  afterAll(async () => {
    await mockProject.restore();
  });

  describe("search endpoint", () => {
    const searchEndpointResult: SearchEndpointResult = {
      objects: [
        {
          package: {
            name: makeDomainName("com.example.package-a"),
            scope: "unscoped",
            version: makeSemanticVersion("1.0.0"),
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
    beforeEach(() => {
      startMockRegistry();
      registerSearchResult("package-a", searchEndpointResult);
      registerSearchResult("pkg-not-exist", searchEndpointEmptyResult);
    });
    afterEach(() => {
      stopMockRegistry();
    });
    it("should print packument information", async () => {
      const consoleSpy = jest.spyOn(console, "log");

      const searchResult = await search("package-a", options);

      expect(searchResult).toBeOk();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("package-a")
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("1.0.0"));
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("2019-10-02")
      );
    });
    it("should notify of unknown packument", async () => {
      const noticeSpy = spyOnLog("notice");

      const searchResult = await search("pkg-not-exist", options);

      expect(searchResult).toBeOk();
      expect(noticeSpy).toHaveLogLike("", "No matches found");
    });
  });

  describe("old search", () => {
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
    beforeEach(() => {
      startMockRegistry();
      nock(exampleRegistryUrl)
        .persist()
        .get(/-\/v1\/search\?text=/)
        .reply(404);
    });
    afterEach(() => {
      stopMockRegistry();
    });
    it("should print packument information", async () => {
      const warnSpy = spyOnLog("warn");
      const consoleSpy = jest.spyOn(console, "log");
      nock(exampleRegistryUrl).get("/-/all").reply(200, allResult, {
        "Content-Type": "application/json",
      });

      const searchResult = await search("package-a", options);

      expect(searchResult).toBeOk();
      expect(warnSpy).toHaveLogLike(
        "",
        "fast search endpoint is not available"
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("package-a")
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("1.0.0"));
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("2019-10-02")
      );
    });
    it("should notify of unknown packument", async () => {
      const noticeSpy = spyOnLog("notice");
      nock(exampleRegistryUrl).get("/-/all").reply(200, allResult, {
        "Content-Type": "application/json",
      });

      const searchResult = await search("pkg-not-exist", options);

      expect(searchResult).toBeOk();
      expect(noticeSpy).toHaveLogLike("", "No matches found");
    });
  });
});
