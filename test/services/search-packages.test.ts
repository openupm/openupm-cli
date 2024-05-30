import { mockService } from "./service.mock";
import { SearchedPackument, SearchRegistry } from "../../src/io/npm-search";
import {
  AllPackuments,
  FetchAllPackuments,
} from "../../src/io/all-packuments-io";
import { makePackagesSearcher } from "../../src/services/search-packages";
import { Registry } from "../../src/domain/registry";
import { exampleRegistryUrl } from "../domain/data-registry";
import { Err } from "ts-results-es";
import { makeDomainName } from "../../src/domain/domain-name";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { GenericNetworkError } from "../../src/io/common-errors";
import { AsyncOk } from "../../src/utils/result-utils";

describe("search packages", () => {
  const exampleRegistry: Registry = {
    url: exampleRegistryUrl,
    auth: null,
  };

  const exampleKeyword = "package-a";

  const exampleSearchResult: SearchedPackument = {
    name: makeDomainName("com.example.package-a"),
    versions: { [makeSemanticVersion("1.0.0")]: "latest" },
    description: "A demo package",
    date: new Date(2019, 9, 2, 3, 2, 38),
    "dist-tags": { latest: makeSemanticVersion("1.0.0") },
  };

  const exampleAllPackumentsResult = {
    _updated: 99999,
    [exampleSearchResult.name]: exampleSearchResult,
  } as AllPackuments;

  function makeDependencies() {
    const searchRegistry = mockService<SearchRegistry>();
    searchRegistry.mockReturnValue(AsyncOk([exampleSearchResult]));

    const fetchAllPackument = mockService<FetchAllPackuments>();
    fetchAllPackument.mockReturnValue(AsyncOk(exampleAllPackumentsResult));

    const searchPackages = makePackagesSearcher(
      searchRegistry,
      fetchAllPackument
    );
    return { searchPackages, searchRegistry, fetchAllPackument } as const;
  }

  it("should search using search api first", async () => {
    const { searchPackages } = makeDependencies();

    const result = await searchPackages(exampleRegistry, exampleKeyword)
      .promise;

    expect(result).toBeOk((actual) =>
      expect(actual).toEqual([exampleSearchResult])
    );
  });

  it("should not notify of fallback when using search api", async () => {
    const { searchPackages } = makeDependencies();

    const fallback = jest.fn();
    await searchPackages(exampleRegistry, exampleKeyword, fallback).promise;

    expect(fallback).not.toHaveBeenCalled();
  });

  it("should search using old search if search api is not available", async () => {
    const { searchPackages, searchRegistry } = makeDependencies();
    searchRegistry.mockReturnValue(
      Err(new GenericNetworkError()).toAsyncResult()
    );

    const result = await searchPackages(exampleRegistry, exampleKeyword)
      .promise;

    expect(result).toBeOk((actual) =>
      expect(actual).toEqual([exampleSearchResult])
    );
  });

  it("should notify of using old search", async () => {
    const { searchPackages, searchRegistry } = makeDependencies();
    searchRegistry.mockReturnValue(
      Err(new GenericNetworkError()).toAsyncResult()
    );

    const fallback = jest.fn();
    await searchPackages(exampleRegistry, exampleKeyword, fallback).promise;

    expect(fallback).toHaveBeenCalled();
  });

  it("should not find packages not matching the keyword using old search", async () => {
    const { searchPackages, searchRegistry } = makeDependencies();
    searchRegistry.mockReturnValue(
      Err(new GenericNetworkError()).toAsyncResult()
    );

    const result = await searchPackages(exampleRegistry, "some other keyword")
      .promise;

    expect(result).toBeOk((actual) => expect(actual).toEqual([]));
  });

  it("should fail if both search strategies fail", async () => {
    const { searchPackages, searchRegistry, fetchAllPackument } =
      makeDependencies();
    searchRegistry.mockReturnValue(
      Err(new GenericNetworkError()).toAsyncResult()
    );
    fetchAllPackument.mockReturnValue(
      Err(new GenericNetworkError()).toAsyncResult()
    );

    const result = await searchPackages(exampleRegistry, exampleKeyword)
      .promise;

    expect(result).toBeError();
  });
});
