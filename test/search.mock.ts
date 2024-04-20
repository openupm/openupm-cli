import { SearchedPackument, SearchService } from "../src/services/search";
import { Registry } from "../src/domain/registry";
import { AsyncResult, Err, Ok } from "ts-results-es";
import { HttpErrorBase } from "npm-registry-fetch";

type Entry = [searchText: string, results: ReadonlyArray<SearchedPackument>];

export function mockSearchService(
  fastAvailable: boolean,
  ...entries: Entry[]
): SearchService {
  return {
    trySearch(
      _: Registry,
      keyword: string
    ): AsyncResult<ReadonlyArray<SearchedPackument>, HttpErrorBase> {
      if (!fastAvailable)
        return Err({ statusCode: 500 } as HttpErrorBase).toAsyncResult();

      const entry = entries.find((it) => it[0].includes(keyword));
      if (entry === undefined) return Ok([]).toAsyncResult();

      return Ok(entry[1]).toAsyncResult();
    },
  };
}
