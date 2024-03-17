import log from "./logger";
import * as os from "os";
import { EnvParseError, parseEnv } from "./utils/env";
import { CmdOptions } from "./types/options";
import {
  makeNpmClient,
  NpmClient,
  Registry,
  SearchedPackument,
} from "./npm-client";
import { formatAsTable } from "./output-formatting";
import { Ok, Result } from "ts-results-es";
import { HttpErrorBase } from "npm-registry-fetch";

export type SearchError = EnvParseError | HttpErrorBase;

export type SearchOptions = CmdOptions;

const searchEndpoint = async function (
  npmClient: NpmClient,
  registry: Registry,
  keyword: string
): Promise<Result<SearchedPackument[], HttpErrorBase>> {
  const results = await npmClient.trySearch(registry, keyword).promise;

  if (results.isOk()) log.verbose("npmsearch", results.value.join(os.EOL));

  return results;
};

const searchOld = async function (
  npmClient: NpmClient,
  registry: Registry,
  keyword: string
): Promise<Result<SearchedPackument[], HttpErrorBase>> {
  return (await npmClient.tryGetAll(registry)).map((allPackuments) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _updated, ...packumentEntries } = allPackuments;
    const packuments = Object.values(packumentEntries);

    log.verbose("endpoint.all", packuments.join(os.EOL));

    // filter keyword
    const klc = keyword.toLowerCase();

    return packuments.filter((packument) =>
      packument.name.toLowerCase().includes(klc)
    );
  });
};

export async function search(
  keyword: string,
  options: SearchOptions
): Promise<Result<void, SearchError>> {
  // parse env
  const envResult = await parseEnv(options, true);
  if (envResult.isErr()) return envResult;
  const env = envResult.value;

  const npmClient = makeNpmClient();

  // search endpoint
  let result = await searchEndpoint(npmClient, env.registry, keyword);

  // search old search
  if (result.isErr()) {
    log.warn("", "fast search endpoint is not available, using old search.");
    result = await searchOld(npmClient, env.registry, keyword);
  }
  if (result.isErr()) {
    log.warn("", "/-/all endpoint is not available");
    return result;
  }

  const results = result.value;

  if (results.length === 0) {
    log.notice("", `No matches found for "${keyword}"`);
    return Ok(undefined);
  }

  console.log(formatAsTable(results));
  return Ok(undefined);
}
