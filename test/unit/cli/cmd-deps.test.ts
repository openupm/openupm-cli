import { makeDepsCmd } from "../../../src/cli/cmd-deps";
import { ResultCodes } from "../../../src/cli/result-codes";
import { PackumentNotFoundError } from "../../../src/common-errors";
import {
  makeGraphFromSeed,
  markBuiltInResolved,
  markRemoteResolved,
} from "../../../src/domain/dependency-graph";
import { DomainName } from "../../../src/domain/domain-name";
import { makePackageReference } from "../../../src/domain/package-reference";
import { SemanticVersion } from "../../../src/domain/semantic-version";
import { noopLogger } from "../../../src/logging";
import { ResolveDependencies } from "../../../src/services/dependency-resolving";
import { GetLatestVersion } from "../../../src/services/get-latest-version";
import { GetRegistryAuth } from "../../../src/services/get-registry-auth";
import { Env, ParseEnv } from "../../../src/services/parse-env";
import { exampleRegistryUrl } from "../domain/data-registry";
import { mockService } from "../services/service.mock";
import { makeMockLogger } from "./log.mock";

const somePackage = DomainName.parse("com.some.package");
const otherPackage = DomainName.parse("com.other.package");
const anotherPackage = DomainName.parse("com.another.package");

const defaultEnv = {
  primaryRegistryUrl: exampleRegistryUrl,
} as Env;

const someVersion = SemanticVersion.parse("1.2.3");

function makeDependencies() {
  const parseEnv = mockService<ParseEnv>();
  parseEnv.mockResolvedValue(defaultEnv);

  const resolveDependencies = mockService<ResolveDependencies>();
  let defaultGraph = makeGraphFromSeed(somePackage, someVersion);
  defaultGraph = markRemoteResolved(
    defaultGraph,
    somePackage,
    someVersion,
    exampleRegistryUrl,
    { [otherPackage]: someVersion }
  );
  defaultGraph = markRemoteResolved(
    defaultGraph,
    otherPackage,
    someVersion,
    exampleRegistryUrl,
    {}
  );
  resolveDependencies.mockResolvedValue(defaultGraph);

  const resolveLatestVersion = mockService<GetLatestVersion>();
  resolveLatestVersion.mockResolvedValue(someVersion);

  const getRegistryAuth = mockService<GetRegistryAuth>();
  getRegistryAuth.mockResolvedValue({ url: exampleRegistryUrl, auth: null });

  const log = makeMockLogger();

  const depsCmd = makeDepsCmd(
    parseEnv,
    resolveDependencies,
    resolveLatestVersion,
    getRegistryAuth,
    log,
    noopLogger
  );
  return {
    depsCmd,
    parseEnv,
    resolveDependencies,
    resolveLatestVersion,
    log,
  } as const;
}

describe("cmd-deps", () => {
  it("should fail if package-reference has url-version", async () => {
    const { depsCmd } = makeDependencies();

    const resultCode = await depsCmd(
      makePackageReference(somePackage, "https://some.registry.com"),
      {}
    );

    expect(resultCode).toEqual(ResultCodes.Error);
  });

  it("should fail if latest version could not be r esolved", async () => {
    const { depsCmd, resolveLatestVersion } = makeDependencies();
    resolveLatestVersion.mockResolvedValue(null);

    await expect(depsCmd(somePackage, {})).rejects.toBeInstanceOf(
      PackumentNotFoundError
    );
  });

  it("should notify if package-reference has url-version", async () => {
    const { depsCmd, log } = makeDependencies();

    await depsCmd(
      makePackageReference(somePackage, "https://some.registry.com"),
      {}
    );

    expect(log.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("url-version")
    );
  });

  it("should print dependency graph", async () => {
    const { depsCmd, resolveDependencies, log } = makeDependencies();
    let graph = makeGraphFromSeed(somePackage, someVersion);
    graph = markRemoteResolved(
      graph,
      somePackage,
      someVersion,
      exampleRegistryUrl,
      {
        [otherPackage]: someVersion,
        [anotherPackage]: someVersion,
      }
    );
    graph = markBuiltInResolved(graph, otherPackage, someVersion);
    graph = markBuiltInResolved(graph, anotherPackage, someVersion);
    resolveDependencies.mockResolvedValue(graph);

    await depsCmd(somePackage, {});

    // Here we just do some generic checks to see if something containing
    // all relevant information was logged. For more detailed testing
    // of the output format see the tests for the dependency graph
    // logging logic.
    expect(log.notice).toHaveBeenCalledWith(
      "",
      expect.stringContaining(somePackage)
    );
    expect(log.notice).toHaveBeenCalledWith(
      "",
      expect.stringContaining(otherPackage)
    );
    expect(log.notice).toHaveBeenCalledWith(
      "",
      expect.stringContaining(anotherPackage)
    );
  });
});