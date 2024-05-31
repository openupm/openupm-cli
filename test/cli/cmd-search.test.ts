import { makeSearchCmd, SearchOptions } from "../../src/cli/cmd-search";
import { makeDomainName } from "../../src/domain/domain-name";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { makeMockLogger } from "./log.mock";
import { SearchedPackument } from "../../src/io/npm-search";
import { exampleRegistryUrl } from "../domain/data-registry";
import { Ok } from "ts-results-es";
import { Env, ParseEnv } from "../../src/services/parse-env";
import { mockService } from "../services/service.mock";
import { SearchPackages } from "../../src/services/search-packages";
import { noopLogger } from "../../src/logging";
import { ResultCodes } from "../../src/cli/result-codes";
import { GenericNetworkError } from "../../src/io/common-errors";
import { AsyncErr, AsyncOk } from "../../src/utils/result-utils";

const exampleSearchResult: SearchedPackument = {
  name: makeDomainName("com.example.package-a"),
  versions: { [makeSemanticVersion("1.0.0")]: "latest" },
  description: "A demo package",
  date: new Date(2019, 9, 2, 3, 2, 38),
  "dist-tags": { latest: makeSemanticVersion("1.0.0") },
};

function makeDependencies() {
  const parseEnv = mockService<ParseEnv>();
  parseEnv.mockResolvedValue(
    Ok({ registry: { url: exampleRegistryUrl, auth: null } } as Env)
  );

  const searchPackages = mockService<SearchPackages>();
  searchPackages.mockReturnValue(AsyncOk([exampleSearchResult]));

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
    searchPackages.mockReturnValue(AsyncOk([]));

    await searchCmd("pkg-not-exist", options);

    expect(log.notice).toHaveBeenCalledWith(
      "",
      expect.stringContaining("No matches found")
    );
  });

  it("should fail if packuments could not be searched", async () => {
    const expected = new GenericNetworkError();
    const { searchCmd, searchPackages } = makeDependencies();
    searchPackages.mockReturnValue(AsyncErr(expected));

    const resultCode = await searchCmd("package-a", options);

    expect(resultCode).toEqual(ResultCodes.Error);
  });

  it("should notify if packuments could not be searched", async () => {
    const expected = new GenericNetworkError();
    const { searchCmd, searchPackages, log } = makeDependencies();
    searchPackages.mockReturnValue(AsyncErr(expected));

    await searchCmd("package-a", options);

    expect(log.warn).toHaveBeenCalledWith(
      "",
      "/-/all endpoint is not available"
    );
  });

  it("should notify when falling back to old search", async () => {
    const { searchCmd, searchPackages, log } = makeDependencies();
    searchPackages.mockImplementation(
      (_registry, _keyword, onUseAllFallback) => {
        onUseAllFallback && onUseAllFallback();
        return AsyncOk([]);
      }
    );

    await searchCmd("package-a", options);

    expect(log.warn).toHaveBeenCalledWith(
      "",
      expect.stringContaining("using old search")
    );
  });
});
