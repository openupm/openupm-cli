import { makeSearchCmd, SearchOptions } from "../src/cli/cmd-search";
import { makeDomainName } from "../src/domain/domain-name";
import { makeSemanticVersion } from "../src/domain/semantic-version";
import { spyOnLog } from "./log.mock";
import { mockUpmConfig } from "./upm-config-io.mock";
import { mockProjectVersion } from "./project-version-io.mock";
import {
  SearchedPackument,
  SearchRegistryService,
} from "../src/services/search-registry";
import { exampleRegistryUrl } from "./data-registry";
import { Err, Ok } from "ts-results-es";
import { HttpErrorBase } from "npm-registry-fetch";
import {
  AllPackumentsResult,
  GetAllPackumentsService,
} from "../src/services/get-all-packuments";
import { Env, ParseEnvService } from "../src/services/parse-env";
import { mockService } from "./service.mock";

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

  const searchRegistry = mockService<SearchRegistryService>();
  searchRegistry.mockReturnValue(Ok([exampleSearchResult]).toAsyncResult());

  const getAllPackuments = mockService<GetAllPackumentsService>();
  getAllPackuments.mockReturnValue(
    Ok({
      _updated: 9999,
      [exampleSearchResult.name]: exampleSearchResult,
    } as AllPackumentsResult).toAsyncResult()
  );

  const searchCmd = makeSearchCmd(parseEnv, searchRegistry, getAllPackuments);
  return [searchCmd, parseEnv, searchRegistry, getAllPackuments] as const;
}

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
    it("should print packument information", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      const [searchCmd] = makeDependencies();

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
      const noticeSpy = spyOnLog("notice");
      const [searchCmd, , searchRegistry] = makeDependencies();
      searchRegistry.mockReturnValue(Ok([]).toAsyncResult());

      const searchResult = await searchCmd("pkg-not-exist", options);

      expect(searchResult).toBeOk();
      expect(noticeSpy).toHaveLogLike("", "No matches found");
    });
  });

  describe("old search", () => {
    it("should print packument information", async () => {
      const warnSpy = spyOnLog("warn");
      const consoleSpy = jest.spyOn(console, "log");
      const [searchCmd, , searchRegistry] = makeDependencies();
      searchRegistry.mockReturnValue(Err({} as HttpErrorBase).toAsyncResult());

      const searchResult = await searchCmd("package-a", options);

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
      const [searchCmd, , searchRegistry, getAllPackuments] =
        makeDependencies();
      searchRegistry.mockReturnValue(Err({} as HttpErrorBase).toAsyncResult());
      getAllPackuments.mockReturnValue(Ok({ _updated: 9999 }).toAsyncResult());

      const searchResult = await searchCmd("pkg-not-exist", options);

      expect(searchResult).toBeOk();
      expect(noticeSpy).toHaveLogLike("", "No matches found");
    });
  });
});
