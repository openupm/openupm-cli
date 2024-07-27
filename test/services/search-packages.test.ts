import { mockService } from "./service.mock";
import { SearchedPackument, SearchRegistry } from "../../src/io/npm-search";
import {
  AllPackuments,
  FetchAllPackuments,
} from "../../src/io/all-packuments-io";
import { makeSearchPackages } from "../../src/services/search-packages";
import { Registry } from "../../src/domain/registry";
import { exampleRegistryUrl } from "../domain/data-registry";
import { DomainName } from "../../src/domain/domain-name";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { noopLogger } from "../../src/logging";

describe("search packages", () => {
  const exampleRegistry: Registry = {
    url: exampleRegistryUrl,
    auth: null,
  };

  const exampleKeyword = "package-a";

  const exampleSearchResult: SearchedPackument = {
    name: DomainName.parse("com.example.package-a"),
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
    searchRegistry.mockResolvedValue([exampleSearchResult]);

    const fetchAllPackument = mockService<FetchAllPackuments>();
    fetchAllPackument.mockResolvedValue(exampleAllPackumentsResult);

    const searchPackages = makeSearchPackages(
      searchRegistry,
      fetchAllPackument,
      noopLogger
    );
    return { searchPackages, searchRegistry, fetchAllPackument } as const;
  }

  it("should search using search api first", async () => {
    const { searchPackages } = makeDependencies();

    const actual = await searchPackages(exampleRegistry, exampleKeyword);

    expect(actual).toEqual([exampleSearchResult]);
  });

  it("should not notify of fallback when using search api", async () => {
    const { searchPackages } = makeDependencies();

    const fallback = jest.fn();
    await searchPackages(exampleRegistry, exampleKeyword, fallback);

    expect(fallback).not.toHaveBeenCalled();
  });

  it("should search using old search if search api is not available", async () => {
    const { searchPackages, searchRegistry } = makeDependencies();
    searchRegistry.mockRejectedValue(new Error());

    const actual = await searchPackages(exampleRegistry, exampleKeyword);

    expect(actual).toEqual([exampleSearchResult]);
  });

  it("should notify of using old search", async () => {
    const { searchPackages, searchRegistry } = makeDependencies();
    searchRegistry.mockRejectedValue(new Error());

    const fallback = jest.fn();
    await searchPackages(exampleRegistry, exampleKeyword, fallback);

    expect(fallback).toHaveBeenCalled();
  });

  it("should not find packages not matching the keyword using old search", async () => {
    const { searchPackages, searchRegistry } = makeDependencies();
    searchRegistry.mockRejectedValue(new Error());

    const actual = await searchPackages(exampleRegistry, "some other keyword");

    expect(actual).toEqual([]);
  });
});
