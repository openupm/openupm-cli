import { makeSearchCmd, SearchOptions } from "../../src/cli/cmd-search";
import { makeDomainName } from "../../src/domain/domain-name";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { makeMockLogger } from "./log.mock";
import {
  SearchedPackument,
  SearchRegistry,
} from "../../src/io/npm-search";
import { exampleRegistryUrl } from "../domain/data-registry";
import { Err, Ok } from "ts-results-es";
import { HttpErrorBase } from "npm-registry-fetch/lib/errors";
import {
  AllPackumentsR,
  FetchAllPackuments,
} from "../../src/io/all-packuments-io";
import { Env, ParseEnvService } from "../../src/services/parse-env";
import { mockService } from "../services/service.mock";

const exampleSearchResult: SearchedPackument = {
  name: makeDomainName("com.example.package-a"),
  versions: { [makeSemanticVersion("1.0.0")]: "latest" },
  description: "A demo package",
  date: new Date(2019, 9, 2, 3, 2, 38),
  "dist-tags": { latest: makeSemanticVersion("1.0.0") },
};

function makeDependencies() {
  const parseEnv = mockService<ParseEnvService>();
  parseEnv.mockResolvedValue(
    Ok({ registry: { url: exampleRegistryUrl, auth: null } } as Env)
  );

  const searchRegistry = mockService<SearchRegistry>();
  searchRegistry.mockReturnValue(Ok([exampleSearchResult]).toAsyncResult());

  const getAllPackuments = mockService<FetchAllPackuments>();
  getAllPackuments.mockReturnValue(
    Ok({
      _updated: 9999,
      [exampleSearchResult.name]: exampleSearchResult,
    } as AllPackumentsR).toAsyncResult()
  );

  const log = makeMockLogger();

  const searchCmd = makeSearchCmd(
    parseEnv,
    searchRegistry,
    getAllPackuments,
    log
  );
  return {
    searchCmd,
    parseEnv,
    searchRegistry,
    getAllPackuments,
    log,
  } as const;
}

describe("cmd-search", () => {
  const options: SearchOptions = {
    _global: {
      registry: exampleRegistryUrl,
      upstream: false,
    },
  };

  describe("search endpoint", () => {
    it("should print packument information", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      const { searchCmd } = makeDependencies();

      const searchResult = await searchCmd("package-a", options);

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
      const { searchCmd, searchRegistry, log } = makeDependencies();
      searchRegistry.mockReturnValue(Ok([]).toAsyncResult());

      const searchResult = await searchCmd("pkg-not-exist", options);

      expect(searchResult).toBeOk();
      expect(log.notice).toHaveLogLike(
        "",
        expect.stringContaining("No matches found")
      );
    });
  });

  describe("old search", () => {
    it("should print packument information", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      const { searchCmd, searchRegistry, log } = makeDependencies();
      searchRegistry.mockReturnValue(Err({} as HttpErrorBase).toAsyncResult());

      const searchResult = await searchCmd("package-a", options);

      expect(searchResult).toBeOk();
      expect(log.warn).toHaveLogLike(
        "",
        expect.stringContaining("fast search endpoint is not available")
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
      const { searchCmd, searchRegistry, log, getAllPackuments } =
        makeDependencies();
      searchRegistry.mockReturnValue(Err({} as HttpErrorBase).toAsyncResult());
      getAllPackuments.mockReturnValue(Ok({ _updated: 9999 }).toAsyncResult());

      const searchResult = await searchCmd("pkg-not-exist", options);

      expect(searchResult).toBeOk();
      expect(log.notice).toHaveLogLike(
        "",
        expect.stringContaining("No matches found")
      );
    });
  });
});
