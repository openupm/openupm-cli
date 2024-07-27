import { makeSearchCmd, SearchOptions } from "../../src/cli/cmd-search";
import { DomainName } from "../../src/domain/domain-name";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { makeMockLogger } from "./log.mock";
import { SearchedPackument } from "../../src/io/npm-search";
import { exampleRegistryUrl } from "../domain/data-registry";
import { Env, ParseEnv } from "../../src/services/parse-env";
import { mockService } from "../services/service.mock";
import { SearchPackages } from "../../src/services/search-packages";
import { noopLogger } from "../../src/logging";
import { ResultCodes } from "../../src/cli/result-codes";

const exampleSearchResult: SearchedPackument = {
  name: DomainName.parse("com.example.package-a"),
  versions: { [makeSemanticVersion("1.0.0")]: "latest" },
  description: "A demo package",
  date: new Date(2019, 9, 2, 3, 2, 38),
  "dist-tags": { latest: makeSemanticVersion("1.0.0") },
};

function makeDependencies() {
  const parseEnv = mockService<ParseEnv>();
  parseEnv.mockResolvedValue({
    registry: { url: exampleRegistryUrl, auth: null },
  } as Env);

  const searchPackages = mockService<SearchPackages>();
  searchPackages.mockResolvedValue([exampleSearchResult]);

  const log = makeMockLogger();

  const searchCmd = makeSearchCmd(parseEnv, searchPackages, log, noopLogger);
  return {
    searchCmd,
    parseEnv,
    searchPackages,
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

  it("should print packument information", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    const { searchCmd } = makeDependencies();

    await searchCmd("package-a", options);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("package-a")
    );
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("1.0.0"));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("2019-10-02")
    );
  });

  it("should be ok if no network error occurred", async () => {
    const { searchCmd } = makeDependencies();

    const resultCode = await searchCmd("pkg-not-exist", options);

    expect(resultCode).toEqual(ResultCodes.Ok);
  });

  it("should notify of unknown packument", async () => {
    const { searchCmd, searchPackages, log } = makeDependencies();
    searchPackages.mockResolvedValue([]);

    await searchCmd("pkg-not-exist", options);

    expect(log.notice).toHaveBeenCalledWith(
      "",
      expect.stringContaining("No matches found")
    );
  });

  it("should notify when falling back to old search", async () => {
    const { searchCmd, searchPackages, log } = makeDependencies();
    searchPackages.mockImplementation(
      async (_registry, _keyword, onUseAllFallback) => {
        onUseAllFallback && onUseAllFallback();
        return [];
      }
    );

    await searchCmd("package-a", options);

    expect(log.warn).toHaveBeenCalledWith(
      "",
      expect.stringContaining("using old search")
    );
  });
});
