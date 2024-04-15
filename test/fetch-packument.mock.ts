import { RegistryUrl } from "../src/domain/registry-url";
import { UnityPackument } from "../src/domain/packument";
import { FetchPackumentService } from "../src/services/fetch-packument";
import { Registry } from "../src/domain/registry";
import { DomainName } from "../src/domain/domain-name";
import { AsyncResult, Ok } from "ts-results-es";
import { HttpErrorBase } from "npm-registry-fetch";

type Entry = [RegistryUrl, UnityPackument];

export function mockFetchPackumentService(
  ...entries: ReadonlyArray<Entry>
): FetchPackumentService {
  return {
    tryFetchByName(
      registry: Registry,
      name: DomainName
    ): AsyncResult<UnityPackument | null, HttpErrorBase> {
      const matchingEntry = entries.find(
        (entry) => entry[0] === registry.url && entry[1].name === name
      );
      if (matchingEntry === undefined) return Ok(null).toAsyncResult();

      return Ok(matchingEntry[1]).toAsyncResult();
    },
  };
}
