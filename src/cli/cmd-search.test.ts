import { search, SearchOptions } from "./cmd-search";
import { makeDomainName } from "../domain/domain-name";
import { makeSemanticVersion } from "../domain/semantic-version";
import { spyOnLog } from "../utils/log.mock";
import { mockUpmConfig } from "../io/upm-config-io.mock";
import { mockProjectVersion } from "../io/project-version-io.mock";
import { mockSearchService } from "../services/search-service.mock";
import { makeSearchService, SearchedPackument } from "../services/search";
import { exampleRegistryUrl } from "../domain/data-registry";

jest.mock("../services/search");

const exampleSearchResult: SearchedPackument = {
  name: makeDomainName("com.example.package-a"),
  versions: { [makeSemanticVersion("1.0.0")]: "latest" },
  description: "A demo package",
  date: new Date(2019, 9, 2, 3, 2, 38),
  "dist-tags": { latest: makeSemanticVersion("1.0.0") },
};

describe("cmd-search", () => {
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

  describe("search endpoint", () => {
    beforeEach(() => {
      const searchService = mockSearchService(true, [
        "package-a",
        [exampleSearchResult],
      ]);
      jest.mocked(makeSearchService).mockReturnValue(searchService);
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
    beforeEach(() => {
      const searchService = mockSearchService(false, [
        "package-a",
        [exampleSearchResult],
      ]);
      jest.mocked(makeSearchService).mockReturnValue(searchService);
    });

    it("should print packument information", async () => {
      const warnSpy = spyOnLog("warn");
      const consoleSpy = jest.spyOn(console, "log");

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

      const searchResult = await search("pkg-not-exist", options);

      expect(searchResult).toBeOk();
      expect(noticeSpy).toHaveLogLike("", "No matches found");
    });
  });
});
